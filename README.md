# UI Forge - Professional Component Library Skill

<div align="center">

![Components](https://img.shields.io/badge/Components-4360+-blue?style=flat-square)
![Categories](https://img.shields.io/badge/Categories-47-green?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)
![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?style=flat-square&logo=typescript)

A powerful Claude Code skill providing instant access to 4360+ production-ready React components across 47 categories.

[English](#english) | [中文文档](#中文文档)

</div>

---

## English

### Overview

UI Forge is a comprehensive component library skill that helps developers build beautiful, modern user interfaces faster. When building frontend applications, Claude will automatically suggest and integrate the perfect components for your needs.

### Features

Massive Library
- 4360+ production-ready components
- 47 organized categories
- 154MB of high-quality code

Smart Integration
- AI-powered component discovery
- Context-aware recommendations
- Complete code with dependencies
- Customization guidance

Production Ready
- Modern React patterns
- TypeScript support
- Tailwind CSS styling
- Responsive design
- Accessibility built-in

### Installation

Method 1: Clone Repository

```bash
git clone git@github.com:3135804887-ops/UI-Forge-Skill.git
cd UI-Forge-Skill

# macOS/Linux
cp -r . ~/.claude/skills/ui-forge

# Windows
xcopy . %USERPROFILE%\.claude\skills\ui-forge /E /I
```

Method 2: Download Release

1. Download the latest .skill package from Releases
2. Install via Claude Code: /skills install ui-forge.skill

### Component Library Setup

Important: The skill requires component files to be present on your system.

Component Library Path: F:\爬虫\21st_components_full\

For macOS/Linux users, update the path in SKILL.md:

```markdown
## Component Library Location

All components are stored at: /your/custom/path/
```

Verify Installation:

```bash
# Windows
dir F:\爬虫\21st_components_full\

# macOS/Linux  
ls /your/custom/path/
```

You should see 47 category directories (button, card, hero, etc.)

### Usage Examples

Building a Landing Page

```
User: "I need to build a landing page for my SaaS product"

Claude: I'll help you build that with UI Forge components!
Let me suggest:
- Hero section with gradient background
- Feature showcase cards
- Pricing comparison table
- Testimonials carousel
- CTA section

[provides complete implementation for each]
```

Creating Custom Buttons

```
User: "I need an animated button"

Claude: Found 3 great options:
1. Shimmer Button - Smooth shimmer effect
2. Magnetic Button - Follows cursor
3. Glow Button - Pulsing animation

Which style fits your design?
```

Dashboard Components

```
User: "Build an analytics dashboard"

Claude: Setting you up with:
- Responsive navbar
- Stat cards with animations  
- Interactive charts
- Data tables
- Notification system

[provides complete code]
```

### Component Categories

Top 20 Categories:

| Category       | Count | Category       | Count |
|----------------|-------|----------------|-------|
| card           | 226   | hero           | 220   |
| input          | 214   | button         | 211   |
| form           | 184   | calendar       | 177   |
| accordion      | 155   | text           | 152   |
| avatar         | 149   | shader         | 142   |
| badge          | 138   | image          | 135   |
| background     | 132   | menu           | 131   |
| features       | 119   | checkbox       | 118   |
| modal-dialog   | 97    | dropdown       | 91    |
| alert          | 87    | carousel       | 86    |

View complete list in CATEGORIES.md

### Technical Stack

- React 18+ - Modern hooks and patterns
- TypeScript - Full type safety
- Tailwind CSS - Utility-first styling
- Framer Motion - Smooth animations
- Lucide React - Icon system
- shadcn/ui - Component foundation

### Documentation

- Full Category List (CATEGORIES.md) - All 47 categories detailed
- Contributing Guide (CONTRIBUTING.md) - How to contribute
- Example: Landing Page (examples/landing-page.md) - Complete tutorial

### Configuration

Change Component Library Path:

Edit SKILL.md line 96:

```markdown
All components are stored at: /your/custom/path/
```

Customize Triggering:

Edit the description field in SKILL.md frontmatter to adjust when the skill activates.

### Contributing

Contributions welcome! See CONTRIBUTING.md for guidelines.

### License

MIT License - see LICENSE for details.

### Links

- Repository: github.com/3135804887-ops/UI-Forge-Skill
- Issues: Report bugs at github.com/3135804887-ops/UI-Forge-Skill/issues
- Discussions: Join community at github.com/3135804887-ops/UI-Forge-Skill/discussions

---

## 中文文档

### 概述

UI Forge 是一个综合性组件库技能，帮助开发者更快速地构建美观、现代的用户界面。在构建前端应用时，Claude 会自动建议并集成最适合你需求的组件。

### 特性

海量组件库
- 4360+ 生产级组件
- 47 个分类
- 154MB 高质量代码

智能集成
- AI 驱动的组件发现
- 上下文感知推荐
- 完整代码和依赖说明
- 定制化指导

生产就绪
- 现代 React 模式
- TypeScript 支持
- Tailwind CSS 样式
- 响应式设计
- 内置无障碍支持

### 安装

方式一：克隆仓库

```bash
git clone git@github.com:3135804887-ops/UI-Forge-Skill.git
cd UI-Forge-Skill

# macOS/Linux
cp -r . ~/.claude/skills/ui-forge

# Windows
xcopy . %USERPROFILE%\.claude\skills\ui-forge /E /I
```

方式二：下载发行版

1. 从 Releases 下载最新的 .skill 包
2. 通过 Claude Code 安装：/skills install ui-forge.skill

### 组件库设置

重要：技能需要组件文件存在于你的系统中。

组件库路径：F:\爬虫\21st_components_full\

macOS/Linux 用户需要在 SKILL.md 中更新路径：

```markdown
## Component Library Location

All components are stored at: /your/custom/path/
```

验证安装：

```bash
# Windows
dir F:\爬虫\21st_components_full\

# macOS/Linux  
ls /your/custom/path/
```

你应该能看到 47 个分类目录（button、card、hero 等）

### 使用示例

构建落地页

```
用户："我需要为我的 SaaS 产品构建一个落地页"

Claude：我会使用 UI Forge 组件来帮你构建！
让我推荐：
- 带渐变背景的主视觉区
- 功能展示卡片
- 价格对比表
- 用户评价轮播
- 行动号召区域

[提供每个部分的完整实现]
```

创建自定义按钮

```
用户："我需要一个动画按钮"

Claude：找到3个很棒的选项：
1. 闪光按钮 - 流畅的闪光效果
2. 磁性按钮 - 跟随光标
3. 发光按钮 - 脉冲动画

哪种风格适合你的设计？
```

仪表板组件

```
用户："构建一个分析仪表板"

Claude：为你设置：
- 响应式导航栏
- 带动画的统计卡片
- 交互式图表
- 数据表格
- 通知系统

[提供完整代码]
```

### 组件分类

前 20 个分类：

| 分类           | 数量  | 分类           | 数量  |
|----------------|-------|----------------|-------|
| 卡片           | 226   | 主视觉         | 220   |
| 输入框         | 214   | 按钮           | 211   |
| 表单           | 184   | 日历           | 177   |
| 手风琴         | 155   | 文本           | 152   |
| 头像           | 149   | 着色器         | 142   |
| 徽章           | 138   | 图片           | 135   |
| 背景           | 132   | 菜单           | 131   |
| 特性           | 119   | 复选框         | 118   |
| 模态框         | 97    | 下拉菜单       | 91    |
| 提示           | 87    | 轮播图         | 86    |

查看 CATEGORIES.md 了解完整列表

### 技术栈

- React 18+ - 现代 hooks 和模式
- TypeScript - 完整类型安全
- Tailwind CSS - 实用优先样式
- Framer Motion - 流畅动画
- Lucide React - 图标系统
- shadcn/ui - 组件基础

### 文档

- 完整分类列表 (CATEGORIES.md) - 全部 47 个分类详情
- 贡献指南 (CONTRIBUTING.md) - 如何贡献
- 示例：落地页 (examples/landing-page.md) - 完整教程

### 配置

更改组件库路径：

编辑 SKILL.md 第 96 行：

```markdown
All components are stored at: /your/custom/path/
```

自定义触发：

编辑 SKILL.md 文件头部的 description 字段来调整技能激活条件。

### 贡献

欢迎贡献！请查看 CONTRIBUTING.md 了解指南。

### 许可证

MIT 许可证 - 详见 LICENSE

### 链接

- 仓库：github.com/3135804887-ops/UI-Forge-Skill
- 问题：在 github.com/3135804887-ops/UI-Forge-Skill/issues 报告 Bug
- 讨论：在 github.com/3135804887-ops/UI-Forge-Skill/discussions 加入社区

---

<div align="center">

Made for the Claude Code community

If this skill helps you build faster, give us a star on GitHub

</div>
