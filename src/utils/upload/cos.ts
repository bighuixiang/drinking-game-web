import { Api } from '@/api/'

export type UploadProgress = (percent: number) => void

export interface UploadResult {
  key: string
  etag: string
  size: number
  mime: string
}

interface PresignedUrlResp {
  url?: string
  key: string
  expires: number
  uploadDir: string
  maxSizeMb?: number
  allowedExts?: string[]
  keyStrategy?: string
  uploadUrl?: string
}

let cachedConfig: Omit<PresignedUrlResp, 'url' | 'expires' | 'key'> | null = null

function isConfigExpired(config: PresignedUrlResp | null) {
  if (!config) { return true }
  const now = Math.floor(Date.now() / 1000)
  return now > (config.expires - 60) // 提前1分钟刷新
}

async function getPresignedUrl(file: File, currDir: string): Promise<PresignedUrlResp> {
  const key = buildObjectKey(file)

  // 服务端返回字段为 uploadUrl/objectKey/expiresIn，这里做一次归一化
  const raw = await Api.netDiskManage.storageCosPresignedUrl({
    key,
    contentType: file.type,
    expires: 3600, // 1小时过期
    fileName: file.name || `文件${new Date().getTime()}`,
    fileSize: file.size,
    mimeType: file.type,
    path: currDir,
  })

  const response: PresignedUrlResp = {
    url: raw.uploadUrl,
    key: raw.objectKey,
    expires: raw.expiresIn,
    uploadDir: raw.uploadDir,
    maxSizeMb: raw.maxSizeMb,
    allowedExts: raw.allowedExts,
    keyStrategy: raw.keyStrategy,
  }

  // 缓存配置信息
  if (!cachedConfig || cachedConfig.uploadDir !== response.uploadDir) {
    cachedConfig = {
      uploadDir: response.uploadDir,
      maxSizeMb: response.maxSizeMb,
      allowedExts: response.allowedExts,
      keyStrategy: response.keyStrategy,
    }
  }

  return response
}

function buildObjectKey(file: File): string {
  // 优先使用后端返回的 uploadDir 作为根目录，其余目录由组件通过 file.name 传入
  const safeName = file.name.startsWith('/') ? file.name.slice(1) : file.name
  if (cachedConfig?.uploadDir) {
    return `${cachedConfig.uploadDir}${safeName}`
  }
  // 首次请求还未拿到 uploadDir 时，直接使用传入的文件名（其中已包含前端期望的相对目录）
  return `${safeName}`
}

export async function uploadFileWithCos(file: File, onProgress?: UploadProgress, signal?: AbortSignal, currDir?: string): Promise<UploadResult> {
  // 获取预签名URL
  const presignedUrl = await getPresignedUrl(file, currDir ?? '')
  // 验证文件大小和类型
  if (presignedUrl.maxSizeMb && file.size > presignedUrl.maxSizeMb * 1024 * 1024) {
    throw new Error(`文件超过大小限制：${presignedUrl.maxSizeMb}MB`)
  }
  if (presignedUrl.allowedExts && presignedUrl.allowedExts.length > 0) {
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!presignedUrl.allowedExts.map(e => e.toLowerCase()).includes(ext)) {
      throw new Error(`不支持的文件类型：.${ext}`)
    }
  }

  const Key = presignedUrl.key
  const isLarge = file.size > 5 * 1024 * 1024

  /**
   * 使用XMLHttpRequest支持进度回调
   */
  const uploadWithXHR = (): Promise<{ ETag: string }> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100)
            onProgress(percent)
          }
        })
      }

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const etag = xhr.getResponseHeader('ETag') || ''
          resolve({ ETag: etag })
        }
        else {
          reject(new Error(`上传失败: ${xhr.status} ${xhr.statusText}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('网络错误'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('上传已取消'))
      })
      xhr.open('PUT', presignedUrl.url ?? presignedUrl.uploadUrl ?? '')
      xhr.setRequestHeader('Content-Type', file.type)
      xhr.send(file)

      if (signal) {
        signal.addEventListener('abort', () => {
          xhr.abort()
        })
      }
    })
  }

  /**
   * 使用fetch API直接上传到预签名URL（无进度回调）
   */
  const uploadWithFetch = async (): Promise<{ ETag: string }> => {
    const response = await fetch(presignedUrl.url ?? presignedUrl.uploadUrl ?? '', {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
      signal,
    })

    if (!response.ok) {
      throw new Error(`上传失败: ${response.status} ${response.statusText}`)
    }

    // 从响应头获取ETag
    const etag = response.headers.get('ETag') || response.headers.get('etag') || ''
    return { ETag: etag }
  }

  const result = await (onProgress ? uploadWithXHR() : uploadWithFetch())

  return {
    key: Key,
    etag: result.ETag,
    size: file.size,
    mime: file.type,
  }
}

export async function confirmUpload(result: UploadResult) {
  return Api.netDiskManage.storageCosConfirm({
    key: result.key,
    etag: result.etag,
    size: result.size,
    mime: result.mime,
  })
}

/**
 * 新增：获取预签名下载URL
 */
export async function getDownloadUrl(key: string, expires: number = 3600): Promise<string> {
  const response = await Api.netDiskManage.storageCosDownloadUrl({
    key,
    expires,
  })
  return response.url
}
