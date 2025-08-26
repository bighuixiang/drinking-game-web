import COS from 'cos-js-sdk-v5'
import { Api } from '@/api/'

export type UploadProgress = (percent: number) => void

export interface UploadResult {
  key: string
  etag: string
  size: number
  mime: string
}

interface StsResp {
  credentials: { tmpSecretId: string; tmpSecretKey: string; sessionToken: string }
  startTime: number
  expiredTime: number
  bucket: string
  region: string
  uploadDir: string
  maxSizeMb?: number
  allowedExts?: string[]
  keyStrategy?: string
}

let cachedSts: StsResp | null = null

function isStsExpired(sts: StsResp | null) {
  if (!sts) return true
  const now = Math.floor(Date.now() / 1000)
  return now > (sts.expiredTime - 120)
}

async function getSts(): Promise<StsResp> {
  if (!cachedSts || isStsExpired(cachedSts)) {
    cachedSts = await Api.netDiskManage.storageCosSts()
  }
  return cachedSts
}

function buildObjectKey(sts: StsResp, file: File): string {
  return `${sts.uploadDir}${file.name}`
}

export function createCosInstance() {
  const cos = new COS({
    getAuthorization: async (_options: any, callback: any) => {
      const sts = await getSts()
      callback({
        TmpSecretId: sts.credentials.tmpSecretId,
        TmpSecretKey: sts.credentials.tmpSecretKey,
        SecurityToken: sts.credentials.sessionToken,
        StartTime: sts.startTime,
        ExpiredTime: sts.expiredTime,
      })
    },
  })
  return cos
}

export async function uploadFileWithCos(file: File, onProgress?: UploadProgress, signal?: AbortSignal): Promise<UploadResult> {
  const sts = await getSts()
  if (sts.maxSizeMb && file.size > sts.maxSizeMb * 1024 * 1024) {
    throw new Error(`文件超过大小限制：${sts.maxSizeMb}MB`)
  }
  if (sts.allowedExts && sts.allowedExts.length > 0) {
    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (!sts.allowedExts.map(e => e.toLowerCase()).includes(ext)) {
      throw new Error(`不支持的文件类型：.${ext}`)
    }
  }

  const cos = createCosInstance()
  const Key = buildObjectKey(sts, file)
  const Bucket = sts.bucket
  const Region = sts.region
  const isLarge = file.size > 5 * 1024 * 1024

  const params: any = {
    Bucket,
    Region,
    Key,
    Body: file,
    onProgress: (progressData: any) => {
      if (onProgress) onProgress(Math.round(progressData.percent * 100))
    },
  }

  const doUpload = () => new Promise<any>((resolve, reject) => {
    const cb = (err: any, data: any) => (err ? reject(err) : resolve(data))
    if (isLarge) (cos as any).sliceUploadFile(params, cb)
    else (cos as any).putObject(params, cb)
  })

  if (signal) {
    signal.addEventListener('abort', () => {
      try { (cos as any).cancelTask({ Key }) } catch {}
    })
  }

  const result = await doUpload()
  return { key: Key, etag: result.ETag, size: file.size, mime: file.type }
}

export async function confirmUpload(result: UploadResult) {
  return Api.netDiskManage.storageCosConfirm({
    key: result.key,
    etag: result.etag,
    size: result.size,
    mime: result.mime,
  })
}
