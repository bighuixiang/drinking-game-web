import type { FormSchema } from '@/components/core/schema-form/'

export const roleSchemas: FormSchema<any>[] = [
  {
    field: 'content',
    component: 'InputTextArea',
    label: '题目内容',
    rules: [{ required: true, type: 'string' }],
    componentProps: { rows: 3, placeholder: '请输入表情题目内容，如一串emoji' },
    colProps: { span: 24 },
  },
  {
    field: 'answer',
    component: 'Input',
    label: '答案',
    rules: [{ required: true, type: 'string' }],
    colProps: { span: 24 },
  },
  {
    field: 'difficulty',
    label: '难度',
    component: 'Select',
    defaultValue: 'easy',
    componentProps: {
      options: [
        { label: '简单', value: 'easy' },
        { label: '一般', value: 'medium' },
        { label: '困难', value: 'hard' },
      ],
    },
    colProps: { span: 12 },
  },
  {
    field: 'isActive',
    label: '状态',
    component: 'RadioGroup',
    defaultValue: true,
    componentProps: {
      options: [
        { label: '启用', value: true },
        { label: '停用', value: false },
      ],
    },
    colProps: { span: 12 },
  },
]
