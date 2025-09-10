<script lang="ts" setup>
import type { TableColumnItem, TableListItem } from './columns'
import { ref } from 'vue'
import Api from '@/api/'
import { useTable } from '@/components/core/dynamic-table'
import { useFormModal } from '@/hooks/useModal/'
import { baseColumns } from './columns'
import { roleSchemas } from './formSchemas'

defineOptions({
  name: 'EmojiQuestionBank',
})

const [DynamicTable, dynamicTableInstance] = useTable()

const [showModal] = useFormModal()

/**
 * @description 打开新增/编辑弹窗
 */
const openMenuModal = async (record: Partial<TableListItem>) => {
  const [formRef] = await showModal({
    modalProps: {
      title: `${record.id ? '编辑' : '新增'} Emoji题目`,
      width: '50%',
      onFinish: async (values) => {
        const params = {
          ...values,
          type: 'emoji',
        }
        if (record.id) {
          await Api.questionBankEmoji.qbankUpdate({ id: record.id as number }, params)
        }
        else {
          await Api.questionBankEmoji.qbankCreate(params)
        }

        dynamicTableInstance?.reload()
      },
    },
    formProps: {
      labelWidth: 100,
      schemas: roleSchemas,
    },
  })

  // 如果是编辑的话，需要获取题目详情
  if (record.id) {
    const info = await Api.questionBankEmoji.qbankInfo({ id: record.id as number })
    formRef?.setFieldsValue({
      ...info,
    })
  }
}
const delRowConfirm = async (record: TableListItem) => {
  await Api.questionBankEmoji.qbankDelete({ id: record.id as number })
  dynamicTableInstance?.reload()
}

// 批量导入弹窗状态
const importOpen = ref(false)
const importFormat = ref<'json' | 'csv'>('json')
const importContent = ref('')
const importing = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

const openImportModal = () => {
  importOpen.value = true
}

const triggerPickFiles = () => {
  if (fileInputRef.value) { fileInputRef.value.value = '' }
  fileInputRef.value?.click()
}

function normalizeItem(raw: any) {
  const content = raw?.content ?? raw?.emoji ?? ''
  const answer = raw?.answer ?? raw?.emojiTitle ?? ''
  if (!content) { return null }
  return {
    type: 'emoji',
    content,
    answer,
    difficulty: raw?.difficulty ?? 'easy',
    isActive: typeof raw?.isActive === 'boolean' ? raw.isActive : true,
  }
}

function toCsv(items: any[]) {
  const header = ['type', 'content', 'answer', 'difficulty', 'isActive']
  const escape = (val: any) => {
    const s = String(val ?? '')
    if (/[",\n]/.test(s)) { return `"${s.replace(/"/g, '""')}"` }
    return s
  }
  const lines = [header.join(',')]
  for (const it of items) {
    lines.push(header.map(k => escape((it as any)[k])).join(','))
  }
  return lines.join('\n')
}

const onFilesChange = async (e: Event) => {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files || [])
  if (!files.length) { return }
  importing.value = true
  try {
    const allItems: any[] = []
    for (const f of files) {
      const text = await f.text()
      // 支持文件本身是 CSV 或 JSON
      if (/\.csv$/i.test(f.name) || importFormat.value === 'csv') {
        // 简单透传 CSV 文本，允许多个文件拼接（保留第一个文件的表头）
        if (!importContent.value) {
          importContent.value = text.trim()
        }
        else {
          const lines = text.trim().split(/\r?\n/)
          // 去掉后续文件的首行表头
          if (lines.length > 1) { importContent.value += `\n${lines.slice(1).join('\n')}` }
        }
      }
      else {
        // JSON：文件是数组或对象数组
        try {
          const arr = JSON.parse(text)
          const list = Array.isArray(arr) ? arr : [arr]
          for (const raw of list) {
            const item = normalizeItem(raw)
            if (item) { allItems.push(item) }
          }
        }
        catch (err) {
          // 非法 JSON，跳过
          console.warn('JSON 解析失败：', f.name)
        }
      }
    }
    if (importFormat.value === 'json' && allItems.length) {
      importContent.value = JSON.stringify(allItems, null, 2)
    }
    if (importFormat.value === 'csv' && allItems.length) {
      importContent.value = toCsv(allItems)
    }
  }
  finally {
    importing.value = false
  }
}

const handleImportOk = async () => {
  if (!importContent.value?.trim()) { return }
  await Api.questionBankEmoji.qbankImport({
    format: importFormat.value,
    content: importContent.value,
  })
  importOpen.value = false
  importContent.value = ''
  dynamicTableInstance?.reload()
}

const handleImportCancel = () => {
  importOpen.value = false
}

const columns: TableColumnItem[] = [
  ...baseColumns,
  {
    title: '操作',
    width: 130,
    dataIndex: 'ACTION',
    hideInSearch: true,
    fixed: 'right',
    actions: ({ record }) => [
      {
        label: '编辑',
        onClick: () => {
          openMenuModal(record)
        },
      },
      {
        label: '删除',
        popConfirm: {
          title: '你确定要删除吗？',
          placement: 'left',
          onConfirm: () => delRowConfirm(record),
        },
      },
    ],
  },
]
</script>

<template>
  <DynamicTable
    row-key="id"
    header-title="Emoji 题库管理"
    :data-request="Api.questionBankEmoji.qbankList"
    :columns="columns"
    bordered
    size="small"
  >
    <template #toolbar>
      <a-button type="primary" @click="openMenuModal({})">
        新增
      </a-button>
      <a-button type="primary" @click="openImportModal()">
        批量导入
      </a-button>
    </template>
  </DynamicTable>

  <!-- 隐藏文件选择器 -->
  <input
    ref="fileInputRef"
    type="file"
    multiple
    accept=".json,application/json,.csv,text/csv"
    style="display: none"
    @change="onFilesChange"
  >

  <!-- 批量导入弹窗 -->
  <a-modal
    :open="importOpen"
    title="批量导入 Emoji 题目"
    ok-text="开始导入"
    cancel-text="取消"
    :confirm-loading="importing"
    :ok-button-props="{ disabled: !importContent?.trim() }"
    width="720px"
    @ok="handleImportOk"
    @cancel="handleImportCancel"
  >
    <div style="margin-bottom: 12px; display:flex; align-items:center; gap: 12px; flex-wrap: wrap;">
      <div>
        导入格式：
        <a-radio-group v-model:value="importFormat">
          <a-radio value="json">
            JSON
          </a-radio>
          <a-radio value="csv">
            CSV
          </a-radio>
        </a-radio-group>
      </div>
      <a-button size="small" :loading="importing" @click="triggerPickFiles">
        从文件读取
      </a-button>
      <a-alert
        type="info"
        show-icon
        message="JSON：支持选择多个JSON文件（数组或对象），会自动合并并转换为 {type, content, answer, difficulty, isActive}；CSV：会自动生成包含上述表头的CSV。"
      />
    </div>
    <a-textarea
      v-model:value="importContent"
      :rows="14"
      placeholder="可直接粘贴JSON数组或CSV文本；JSON单项示例："
    />
  </a-modal>
</template>
