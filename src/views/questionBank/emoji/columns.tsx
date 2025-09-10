import type { TableColumn } from '@/components/core/dynamic-table'
import { Tag } from 'ant-design-vue'
import { formatToDateTime } from '@/utils/dateUtil'

export type TableListItem = any
export type TableColumnItem = TableColumn<TableListItem>

export const baseColumns: TableColumnItem[] = [
  {
    title: '#',
    dataIndex: 'id',
    width: 55,
    hideInSearch: true,
  },
  {
    title: '题目内容',
    width: 260,
    dataIndex: 'content',
  },
  {
    title: '答案',
    width: 180,
    dataIndex: 'answer',
  },
  {
    title: '难度',
    dataIndex: 'difficulty',
    width: 100,
    formItemProps: {
      component: 'Select',
      componentProps: {
        options: [
          { label: '简单', value: 'easy' },
          { label: '一般', value: 'medium' },
          { label: '困难', value: 'hard' },
        ],
        allowClear: true,
      },
    },
    customRender: ({ record }) => {
      const map: Record<string, any> = {
        easy: <Tag color="green">简单</Tag>,
        medium: <Tag color="blue">一般</Tag>,
        hard: <Tag color="red">困难</Tag>,
      }
      return map[record.difficulty] || record.difficulty
    },
  },
  {
    title: '状态',
    dataIndex: 'isActive',
    width: 90,
    formItemProps: {
      component: 'Select',
      componentProps: {
        options: [
          {
            label: '启用',
            value: true,
          },
          {
            label: '禁用',
            value: false,
          },
        ],
        allowClear: true,
      },
    },
    customRender: ({ record }) => {
      const enable = !!record.isActive
      return <Tag color={enable ? 'green' : 'red'}>{enable ? '启用' : '停用'}</Tag>
    },
  },
  {
    title: '使用次数',
    dataIndex: 'usageCount',
    width: 100,
    hideInSearch: true,
  },
  {
    title: '创建时间',
    dataIndex: 'createdAt',
    hideInSearch: true,
    customRender: ({ record }) => {
      return formatToDateTime(record.createdAt)
    },
  },
  {
    title: '更新时间',
    dataIndex: 'updatedAt',
    hideInSearch: true,
    customRender: ({ record }) => {
      return formatToDateTime(record.updatedAt)
    },
  },
]
