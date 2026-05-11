# 数据与安全计划

## 1. 核心实体

- users
- roles
- students
- student_profiles
- policy_docs
- approvals
- approval_steps
- notices
- attachments
- operation_logs

## 2. 核心表职责

- `users`：系统账号
- `roles`：角色定义
- `students`：学生基础档案
- `student_profiles`：画像与荣誉扩展信息
- `policy_docs`：政策文档与版本
- `approvals`：审批主单
- `approval_steps`：审批轨迹
- `notices`：通知主体
- `attachments`：附件元数据
- `operation_logs`：审计日志

## 3. 数据分级

- 公共数据：年级、专业、班级等
- 受限数据：手机号、学号关联信息
- 敏感数据：身份证号、特殊学籍状态、审批材料

## 4. 安全原则

- 最小权限
- 分级授权
- 敏感字段脱敏
- 关键操作留痕
- 可追溯、可审计

## 5. 文件管理

- 政策文档存对象存储
- 附件与导入文件独立管理
- 文件与业务记录建立关联
- 保留版本号与更新时间

## 6. 日志要求

- 记录谁、在何时、对什么对象、做了什么
- 覆盖导入、审批、修改模板、权限配置
- 支持查询与导出

## 7. 数据治理

- 统一字段命名
- 统一枚举值
- 保留历史记录
- 定期校验异常数据
