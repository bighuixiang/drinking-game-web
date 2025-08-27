/**
 * COS上传功能测试文件
 * 用于验证从STS到预签名URL的迁移是否正确
 */

import { uploadFileWithCos, confirmUpload, getDownloadUrl } from './cos'
import Api from '@/api/'

// 模拟File对象
const createMockFile = (name: string, size: number, type: string): File => {
  const content = 'test content'
  const blob = new Blob([content], { type })
  return new File([blob], name, { type })
}

// 测试API接口地址
export const testApiEndpoints = async () => {
  console.log('🔍 测试API接口地址...')
  
  try {
    // 测试预签名上传URL接口
    console.log('📤 测试预签名上传URL接口...')
    const presignedUrl = await Api.netDiskManage.storageCosPresignedUrl({
      key: 'test/test.txt',
      contentType: 'text/plain',
      expires: 3600
    })
    console.log('✅ 预签名上传URL接口正常:', presignedUrl)
    
    // 测试预签名下载URL接口
    console.log('🔗 测试预签名下载URL接口...')
    const downloadUrl = await Api.netDiskManage.storageCosDownloadUrl({
      key: 'test/test.txt',
      expires: 3600
    })
    console.log('✅ 预签名下载URL接口正常:', downloadUrl)
    
    return true
  } catch (error) {
    console.error('❌ API接口测试失败:', error)
    return false
  }
}

// 测试用例
export const testCosUpload = async () => {
  console.log('🧪 开始测试COS上传功能...')
  
  try {
    // 测试1: 创建测试文件
    const testFile = createMockFile('test.txt', 1024, 'text/plain')
    console.log('✅ 测试文件创建成功:', testFile.name, testFile.size, 'bytes')
    
    // 测试2: 模拟上传（这里会调用真实的API）
    console.log('📤 开始模拟上传...')
    const result = await uploadFileWithCos(testFile, (progress) => {
      console.log(`📊 上传进度: ${progress}%`)
    })
    
    console.log('✅ 上传成功:', result)
    
    // 测试3: 模拟确认上传
    console.log('✅ 确认上传...')
    await confirmUpload(result)
    console.log('✅ 确认上传成功')
    
    // 测试4: 获取下载URL
    console.log('🔗 获取下载URL...')
    const downloadUrl = await getDownloadUrl(result.key)
    console.log('✅ 下载URL获取成功:', downloadUrl)
    
    console.log('🎉 所有测试通过！')
    return true
    
  } catch (error) {
    console.error('❌ 测试失败:', error)
    return false
  }
}

// 测试预签名URL功能
export const testPresignedUrl = async () => {
  console.log('🔑 测试预签名URL功能...')
  
  try {
    const testFile = createMockFile('presigned-test.txt', 512, 'text/plain')
    
    // 这里会测试预签名URL的生成和上传
    const result = await uploadFileWithCos(testFile)
    console.log('✅ 预签名URL上传测试成功:', result)
    
    return true
  } catch (error) {
    console.error('❌ 预签名URL测试失败:', error)
    return false
  }
}

// 导出测试函数
export default {
  testApiEndpoints,
  testCosUpload,
  testPresignedUrl
}
