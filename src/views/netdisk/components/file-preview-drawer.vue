<script lang="ts" setup>
import { Descriptions, Drawer, Image, Input, message, Space, Spin } from 'ant-design-vue'
import { computed, nextTick, ref } from 'vue'
import { Api } from '@/api/'
import PreviewResource from '@/components/basic/preview-resource/index.vue'
import { hasPermission } from '@/permission'
import { formatSizeUnits } from '@/utils'
import { formatToDateTime } from '@/utils/dateUtil'

defineOptions({
  name: 'FilePreviewDrawer',
})

const detailInfoMap = new Map([
  ['name', '文件名'],
  ['downloadUrl', '文件路径'],
  ['mimeType', '文件类型'],
  ['hash', '文件Hash'],
  ['md5', '文件MD5'],
  ['fsize', '文件大小'],
  ['putTime', '上传时间'],
  ['uploader', '上传人员'],
] as const)

const loading = ref(false)
const visible = ref(false)
const fileName = ref('')
const filePath = ref('')

const detailInfo = ref<Partial<API.SFileInfo & { name: string, fsize: string }>>({})
const previewSrc = ref('')
const mark = ref('')
const updateMarkLoading = ref(false)

// 使用七牛图片处理，减少预览耗费流量
const imageView2Handle = computed(() => {
  return `${previewSrc.value}?imageView2/2/w/500/h/210`
})

const open = async (name, path) => {
  visible.value = true
  fileName.value = name
  filePath.value = path
  await nextTick()
  try {
    loading.value = true
    const fileInfo = {
      name,
      path,
    }
    const data = await Api.netDiskManage.netDiskManageInfo(fileInfo)
    mark.value = data.mark
    Array.from(detailInfoMap.keys()).forEach((key) => {
      if (key === 'fsize') {
        detailInfo.value.fsize = formatSizeUnits(data[key])
      }
      else {
        detailInfo.value[key] = data[key]
      }
    })
    detailInfo.value.putTime = formatToDateTime(data.putTime)
    detailInfo.value.name = name
    if (hasPermission('netdisk:manage:download')) {
      // 可预览
      const url = await Api.netDiskManage.netDiskManageDownload(fileInfo)
      detailInfo.value.downloadUrl = url
      previewSrc.value = url
    }
  }
  catch {
    handleClose()
  }
  finally {
    loading.value = false
  }
}
const updateMark = async () => {
  try {
    updateMarkLoading.value = true
    await Api.netDiskManage.netDiskManageMark({
      name: fileName.value,
      path: filePath.value,
      mark: mark.value,
    })
    message.success('已更新文件备注')
  }
  finally {
    updateMarkLoading.value = false
  }
}
const handleClose = () => {
  fileName.value = ''
  filePath.value = ''
  previewSrc.value = ''
  mark.value = ''
  detailInfo.value = {}
  visible.value = false
}

/**
 * 简洁可靠的复制到剪贴板
 */
const copyText = async (text: string) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    }
    else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.left = '-9999px'
      ta.style.top = '-9999px'
      document.body.appendChild(ta)
      ta.focus()
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    message.success('已复制到剪贴板')
  }
  catch (e) {
    message.error('复制失败，请手动选择复制')
  }
}

const copyUrl = (text: string) => {
  copyText(text)
}

defineExpose({ open })
</script>

<template>
  <Drawer title="文件详情" :width="500" :visible="visible" @close="handleClose">
    <Spin :spinning="loading" class="preview-drawer-inner-box">
      <Space direction="vertical">
        <template v-if="detailInfo.mimeType?.startsWith('image/')">
          <Image
            class="h-[210px] w-full"
            :src="imageView2Handle"
            :preview="{
              src: previewSrc,
            }"
          />
        </template>
        <template v-else>
          <PreviewResource class="h-[210px] w-full" :url="previewSrc" :type="detailInfo.mimeType" />
        </template>
        <Descriptions bordered :column="1" size="small">
          <template v-for="key in detailInfoMap.keys()" :key="key">
            <Descriptions.Item
              :label="detailInfoMap.get(key)"
              :label-style="{ whiteSpace: 'nowrap' }"
            >
              {{ detailInfo[key] }}
              <a-button v-if="key === 'downloadUrl'" type="primary" size="mini" @click="copyUrl(detailInfo[key])">
                复制地址
              </a-button>
            </Descriptions.Item>
          </template>
          <!-- mark -->
          <Descriptions.Item label="文件备注" :label-style="{ whiteSpace: 'nowrap' }">
            <Space direction="vertical" align="end">
              <Input.TextArea
                v-model:value="mark"
                :disabled="!$auth('netdisk:manage:mark')"
                placeholder="请输入文件备注"
                :maxlength="100"
                :rows="4"
                show-count
              />
              <a-button
                :loading="updateMarkLoading"
                :disabled="!$auth('netdisk:manage:mark')"
                type="primary"
                size="mini"
                @click="updateMark"
              >
                更新
              </a-button>
            </Space>
          </Descriptions.Item>
        </Descriptions>
      </Space>
    </Spin>
  </Drawer>
</template>
