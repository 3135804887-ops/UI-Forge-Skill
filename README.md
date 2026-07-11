# UI Forge - Professional Component Library Skill

A powerful Claude Code skill that provides instant access to **4360+ production-ready React components** across 47 categories.

## 🎯 What is UI Forge?

UI Forge is a comprehensive component library skill that helps developers build beautiful, modern user interfaces faster. When building frontend applications, Claude will automatically suggest and integrate the perfect components for your needs.

## ✨ Features

- **4360+ Components**: Massive library covering all UI needs
- **47 Categories**: Organized from buttons to shaders to forms
- **Production Ready**: Modern React/TypeScript components with Tailwind CSS
- **Smart Search**: AI-powered component discovery based on your context
- **Instant Integration**: Complete code + dependencies + customization guide
- **Proactive Suggestions**: Claude recommends components even when you don't ask

## 📦 Installation

### Option 1: Manual Installation

1. Clone this repository:
```bash
git clone https://github.com/YOUR_USERNAME/ui-forge-skill.git
```

2. Copy to Claude skills directory:
```bash
# macOS/Linux
cp -r ui-forge-skill ~/.claude/skills/ui-forge

# Windows
xcopy ui-forge-skill %USERPROFILE%\.claude\skills\ui-forge /E /I
```

3. Download the component library (see below)

### Option 2: Direct Download

1. Download the `.skill` package from [Releases](https://github.com/YOUR_USERNAME/ui-forge-skill/releases)
2. Install using Claude Code: `/skills install ui-forge.skill`
3. Download the component library (see below)

## 📚 Component Library Setup

The skill requires the component library files to be present on your system.

### Download Component Library

**[Download Component Library (154MB)](https://github.com/YOUR_USERNAME/ui-forge-components/releases/latest)**

Extract to: `F:\爬虫\21st_components_full\` (Windows) or update the path in `SKILL.md`

**macOS/Linux users**: Edit `SKILL.md` and change the library path:
```markdown
## Component Library Location

All components are stored at: `/path/to/your/components/`
```

### Verify Installation

```bash
# Check if library is accessible
ls F:\爬虫\21st_components_full\  # Windows
ls /path/to/your/components/       # macOS/Linux
```

You should see 47 category directories (button, card, hero, etc.)

## 🚀 Usage

Once installed, the skill activates automatically when you work on frontend projects.

### Example 1: Building a Landing Page

```
User: "I need to build a landing page for my SaaS product"

Claude: I'll help you build that with components from UI Forge!
Let me suggest:
- A stunning hero section with gradient background
- Feature showcase cards
- Pricing comparison table
- Testimonials carousel
- CTA section
[provides complete code for each]
```

### Example 2: Creating a Button

```
User: "I need a cool animated button"

Claude: I found 3 great options from UI Forge:
1. Shimmer Button - Smooth shimmer effect
2. Magnetic Button - Follows cursor
3. Glow Button - Pulsing animation
Which style fits your design?
```

### Example 3: Dashboard Components

```
User: "Build a dashboard for analytics"

Claude: Perfect! Let me set you up with:
- Responsive navbar
- Stat cards with animations
- Interactive charts
- Data tables
- Notification system
[provides complete implementation]
```

## 📂 Component Categories

UI Forge includes 47 categories with 4360+ components:

| Category | Count | Examples |
|----------|-------|----------|
| **card** | 226 | Profile cards, product cards, stat cards |
| **hero** | 220 | Landing page headers, hero sections |
| **button** | 211 | Animated, gradient, glassmorphism buttons |
| **input** | 214 | Text fields, search bars, file inputs |
| **form** | 184 | Login forms, multi-step forms, validation |
| **calendar** | 177 | Date pickers, scheduling, event calendars |
| **animation** | 142+ | Shaders, backgrounds, effects |
| **navigation** | 170+ | Navbars, menus, breadcrumbs |

**[View Full Category List →](CATEGORIES.md)**

## 🎨 Component Quality

All components are:
- ✅ **Modern**: Built with latest React patterns
- ✅ **TypeScript**: Fully typed for better DX
- ✅ **Responsive**: Mobile-first design
- ✅ **Accessible**: ARIA labels, keyboard navigation
- ✅ **Customizable**: Easy to adapt to your brand
- ✅ **Production Ready**: Battle-tested code

## 🛠️ Technical Stack

Components use popular modern tools:
- **React 18+** with Hooks
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Lucide React** for icons
- **shadcn/ui** compatible

## 📖 How It Works

1. **Automatic Trigger**: Claude detects when you're building UI
2. **Smart Search**: Finds relevant components based on context
3. **Code Extraction**: Reads component implementation from library
4. **Integration Guide**: Provides complete setup instructions
5. **Customization**: Adapts to your design system

## 🔧 Configuration

### Change Library Path

Edit `SKILL.md` line 96:

```markdown
All components are stored at: `/your/custom/path/`
```

### Customize Behavior

The skill automatically triggers for frontend work. To adjust triggering:

Edit the `description` in `SKILL.md` frontmatter to add/remove keywords.

## 📝 Development

### Project Structure

```
ui-forge/
├── SKILL.md              # Main skill instructions
├── README.md             # This file
├── CATEGORIES.md         # Full category listing
├── LICENSE               # MIT License
└── examples/             # Usage examples
    ├── landing-page.md
    ├── dashboard.md
    └── form-wizard.md
```

### Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙋 FAQ

### Q: Do I need to be online to use this skill?

**A:** No! All components are stored locally. Once installed, it works completely offline.

### Q: Can I use these components in commercial projects?

**A:** Yes! All components are production-ready and can be used in any project.

### Q: How do I update the component library?

**A:** Download the latest release and replace the components directory.

### Q: Can I add my own components?

**A:** Yes! Follow the same file structure (`.json` + `_code_*.txt` files) and place them in the appropriate category folder.

### Q: Does this work with Claude.ai?

**A:** This skill is optimized for Claude Code. Claude.ai support may vary.

### Q: Which frameworks are supported?

**A:** Components are built with React. Most can be adapted to Next.js, Remix, or other React frameworks.

## 🔗 Links

- **Documentation**: [Full Docs](https://github.com/YOUR_USERNAME/ui-forge-skill/wiki)
- **Component Library**: [Download](https://github.com/YOUR_USERNAME/ui-forge-components)
- **Examples**: [Code Examples](examples/)
- **Issues**: [Report Bug](https://github.com/YOUR_USERNAME/ui-forge-skill/issues)

## 🌟 Star Us!

If UI Forge helps you build faster, give us a star ⭐ on GitHub!

---

**Made with ❤️ for the Claude Code community**
