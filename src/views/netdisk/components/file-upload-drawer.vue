<script lang="ts" setup>
import type { UploadFile, UploadProps } from 'ant-design-vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'
import { Drawer, Modal, notification, Spin, Upload } from 'ant-design-vue'
import { isEmpty } from 'lodash-es'
import { computed, createVNode, nextTick, ref } from 'vue'
import { confirmUpload, uploadFileWithCos } from '@/utils/upload/cos'

defineOptions({
  name: 'FileUploadDrawer',
})

const emit = defineEmits(['changed'])

const uploadRef = ref<InstanceType<typeof Upload.Dragger>>()
const loading = ref(false)
const visible = ref(false)
const path = ref('')
const subscribes = ref<any[]>([])
const successSubs = ref<any[]>([])
const fileList = ref<UploadFile<any>[]>([])

const title = computed(() => {
  return `上传文件到${
    isEmpty(path.value) ? '根' : path.value.substring(0, path.value.length - 1)
  }目录`
})

const open = (filePath: string) => {
  path.value = filePath
  visible.value = true
  loading.value = false
}
const handleClose = () => {
  if (subscribes.value.length > 0 && subscribes.value.length !== successSubs.value.length) {
    Modal.confirm({
      title: '关闭会取消未上传的文件，确认关闭吗？',
      icon: createVNode(ExclamationCircleOutlined),
      onOk: close,
    })
  }
  else {
    close()
  }
}
const close = () => {
  visible.value = false
  loading.value = false
  path.value = ''
  fileList.value = []
  clear()
}

const uploadFile: UploadProps['customRequest'] = async (param) => {
  const { file, onProgress, onError, onSuccess } = param
  try {
    loading.value = true
    const f = file as File
    // 将 key 前缀拼入文件名（util 内部会使用后端约定的 uploadDir）
    const fileWithPath = new File([f], `${path.value}${f.name}`, { type: f.type })
    const result = await uploadFileWithCos(fileWithPath, (p) => onProgress?.({ percent: p }))
    await confirmUpload(result)
    successSubs.value.push(result)
    onSuccess?.(result as any)
    handleUploadSuccess(f)
  }
  catch (err: any) {
    onError?.(err)
    handleUploadError(err, file as File)
  }
  finally {
    loading.value = false
  }
}
const handleUploadError = (err, file: File) => {
  const failFile = fileList.value.find(n => n.originFileObj === file)
  if (failFile) {
    failFile.status = 'error'
  }
  notification.error({
    message: '上传进度提醒',
    description: `上传${file?.name}文件失败！错误信息：${err?.message || '上传失败'}`,
    duration: 0,
  })
}
const handleUploadSuccess = (file: File) => {
  const successFile = fileList.value.find(n => n.originFileObj === file)
  if (successFile) {
    successFile.status = 'success'
  }
  notification.success({
    message: `上传${successFile?.name}成功`,
  })
}
const clear = async () => {
  if (subscribes.value.length <= 0) {
    return
  }
  const subsTmpArr = subscribes.value
  const successSubsTmpArr = successSubs.value
  subscribes.value = []
  successSubs.value = []
  if (subsTmpArr.length !== successSubsTmpArr.length) {
    for (let i = 0; i < subsTmpArr.length; i++) {
      if (subsTmpArr[i]?.unsubscribe) subsTmpArr[i].unsubscribe()
      subsTmpArr[i] = null
    }
  }
  await nextTick()
  emit('changed')
}

defineExpose({
  open,
})
</script>

<template>
  <div class="file-upload-drawer-container">
    <Drawer
      :title="title"
      :width="400"
      :visible="visible"
      :mask-closable="false"
      @close="handleClose"
    >
      <Spin :spinning="loading" class="upload-inner-box">
        <Upload.Dragger
          ref="uploadRef"
          v-model:file-list="fileList"
          class="upload"
          drag
          action="noaction"
          :multiple="true"
          :custom-request="uploadFile"
        >
          <i class="el-icon-upload" />
          <div class="el-upload__text">
            将文件拖到此处，或<em>点击上传</em>
          </div>
        </Upload.Dragger>
      </Spin>
    </Drawer>
  </div>
</template>

<style lang="less"></style>
