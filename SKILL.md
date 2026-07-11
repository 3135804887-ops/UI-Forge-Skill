---
name: ui-forge
description: Access and integrate 4360+ production-ready React components from a curated professional library. Use this skill whenever the user wants to build UI, needs frontend components, mentions design systems, or asks for specific UI elements like buttons, cards, forms, animations, or any visual component. This skill helps you find the perfect component by style, category, and use case, then integrate it into their project. ALWAYS use this when the user is building a frontend, designing a UI, or mentions needing any kind of visual component.
---

# UI Forge - Professional Component Library

You have access to a professionally curated library of **4360+ production-ready React components** organized into 47 categories. These components are modern, well-designed, and ready to use.

## When to Use This Skill

Use this skill whenever:
- User is building a frontend or web application
- User mentions needing UI components (buttons, cards, forms, etc.)
- User wants to improve their design or UI
- User asks for animations, effects, or interactive elements
- User is working on a dashboard, landing page, or web app
- User mentions design systems or component libraries
- You're designing or prototyping any user interface

Even if the user doesn't explicitly ask for components, if they're doing frontend work, proactively suggest relevant components from this library.

## Component Categories

The library contains 47 categories with the following distribution:

**Top Categories:**
- card (226 components) - Various card designs, layouts, and styles
- hero (220 components) - Hero sections, headers, landing page headers
- input (214 components) - Text inputs, form fields, search bars
- button (211 components) - All types of buttons and CTAs
- form (184 components) - Complete forms, form layouts, multi-step forms
- calendar (177 components) - Date pickers, calendars, scheduling UI
- accordion (155 components) - Collapsible sections, FAQs
- text (152 components) - Typography, text effects, formatting
- avatar (149 components) - User avatars, profile pictures
- shader (142 components) - WebGL effects, gradient backgrounds
- badge (138 components) - Tags, labels, status indicators
- image (135 components) - Image galleries, lightboxes, carousels
- background (132 components) - Animated backgrounds, patterns
- menu (131 components) - Navigation menus, dropdowns
- features (119 components) - Feature sections, product showcases
- checkbox (118 components) - Checkboxes, switches, toggles
- modal-dialog (97 components) - Modals, dialogs, popups
- dropdown (91 components) - Select dropdowns, combo boxes
- alert (87 components) - Notifications, alerts, toasts
- carousel (86 components) - Image/content carousels, sliders
- ai-chat (86 components) - Chat interfaces, AI chat UIs
- date-picker (80 components) - Date selection components
- notification (74 components) - Toast notifications, alerts
- call-to-action (73 components) - CTA sections, conversion elements
- radio-group (71 components) - Radio buttons, option selectors
- pagination (66 components) - Page navigation, infinite scroll
- testimonials (65 components) - Customer reviews, social proof
- popover (63 components) - Tooltips, popovers, info bubbles
- hook (62 components) - React hooks and utilities
- pricing-section (59 components) - Pricing tables, plan comparisons
- link (59 components) - Link styles, navigation links
- scroll-area (56 components) - Scrollable containers, virtual scrolling
- footer (53 components) - Page footers, site navigation
- map (51 components) - Maps, location UI
- announcement (51 components) - Announcement bars, banners
- number (47 components) - Number displays, counters, statistics
- icons (47 components) - Icon sets, icon components
- border (45 components) - Border effects, decorative borders
- video (43 components) - Video players, video backgrounds
- file-tree (40 components) - File explorers, tree views
- navbar-navigation (39 components) - Navigation bars, headers
- select (35 components) - Select menus, dropdowns
- dock (34 components) - Dock-style navigation (macOS-like)
- clients (31 components) - Client logos, partner showcases
- upload-download (27 components) - File upload/download UI
- empty-state (26 components) - Empty states, placeholder UI
- comparison (13 components) - Before/after, comparison sliders

## Component Library Location

All components are stored at: `F:\爬虫\21st_components_full\`

Each category has its own directory containing:
- `.json` files with component metadata
- `_code_*.txt` files with actual component code

## How to Find Components

### Step 1: Understand the User's Need

Listen for keywords and context:
- **Visual elements**: button, card, modal, navbar → check relevant category
- **Functionality**: form, calendar, upload, chat → check functional categories
- **Effects**: animation, shader, background → check effect categories
- **Page sections**: hero, footer, pricing, testimonials → check section categories

### Step 2: Browse the Category

Use the Glob tool to list components in a category:

```bash
# List all components in a category
Glob pattern="*.json" path="F:\爬虫\21st_components_full\button"
```

This shows all available components. Each JSON filename indicates the component name.

### Step 3: Read Component Details

Read the JSON file to get metadata and see what code files are available:

```python
{
  "url": "component-source-url",
  "title": "Component Title",
  "description": "What this component does",
  "category": "button",
  "code_blocks": ["Usage.tsx", "Component.tsx", ...],
  "scraped_at": "timestamp"
}
```

### Step 4: Get the Code

Read the corresponding `_code_*.txt` files to get the actual component code:

```bash
# If JSON is "animated-button.json", code files are:
# - animated-button_code_0.txt
# - animated-button_code_1.txt
# etc.
```

**Code file organization:**
- `_code_0.txt` - Usually the main Usage example
- `_code_1.txt` - Usually the Component implementation
- `_code_2+.txt` - Additional variations or dependencies

### Step 5: Present to User

Show the user:
1. **Component description** (what it does and how it looks)
2. **Component code** (the actual implementation)
3. **Usage example** (how to use it)
4. **Customization tips** (how to adapt it to their needs)

## Integration Workflow

When helping a user integrate a component:

1. **Search for relevant components** based on their description
2. **Show 2-3 best matches** with preview links
3. **Ask which one they prefer** (or recommend your favorite)
4. **Provide the full code** with installation instructions
5. **Explain dependencies** (Tailwind, Framer Motion, etc.)
6. **Customize if needed** (colors, sizes, behavior)

## Best Practices

### Component Selection

- **Match the style**: Look at the component name and description to gauge visual style
- **Check complexity**: Simple components for quick needs, complex for feature-rich
- **Consider dependencies**: Some components need Framer Motion, GSAP, or WebGL
- **Think mobile-first**: Many components are responsive, mention this

### Code Integration

- **Always provide complete code**: Don't just reference, give them the full implementation
- **Explain dependencies**: Mention required libraries (Tailwind, shadcn/ui, Framer Motion)
- **Customize thoughtfully**: Adapt colors, spacing, and text to match their project
- **Test imports**: Make sure all imports are valid and explained

### When Multiple Options Exist

If there are many components in a category:
1. **Filter by name keywords** (e.g., "animated", "gradient", "glass")
2. **Show variety** (different visual styles)
3. **Let user preview** (provide links to see them live)
4. **Recommend based on context** (landing page vs dashboard vs app)

## Example Workflow

**User**: "I need a cool animated button for my landing page"

**Your process**:
1. Search `F:\爬虫\21st_components_full\button\` for animated options
2. Find 3 good candidates (e.g., "shimmer-button", "magnetic-button", "glow-button")
3. Read their JSON files and code
4. Present to user:
   ```
   I found 3 awesome animated buttons:
   
   1. **Shimmer Button** - Smooth shimmer effect on hover
   
   2. **Magnetic Button** - Follows cursor with magnetic effect
   
   3. **Glow Button** - Pulsing glow animation
   
   Which style fits your landing page best?
   ```

5. User picks one → provide full code + integration guide

## Proactive Recommendations

Don't wait for the user to ask specifically. When you see an opportunity:

- **Building a landing page?** → Suggest hero sections, CTAs, testimonials
- **Creating a dashboard?** → Suggest cards, charts, data tables
- **Making a form?** → Suggest input components, validation UI
- **Need visual polish?** → Suggest shader backgrounds, animations
- **Want interactivity?** → Suggest modal dialogs, dropdowns, tooltips

## Technical Details

**File Format**: 
- Component metadata: JSON
- Component code: Plain text (React/TypeScript/TSX)
- Each component typically has 2-6 code blocks

**Common Dependencies**:
- Tailwind CSS (most components)
- Framer Motion (animations)
- Lucide React (icons)
- shadcn/ui (some components)
- React Spring (some animations)
- GSAP (advanced animations)
- Three.js / WebGL (shader components)

**Code Quality**:
- Production-ready, tested components
- Modern React patterns (hooks, TypeScript)
- Accessible (ARIA labels, keyboard navigation)
- Responsive design
- Clean, readable code

## Tips for Success

1. **Be proactive**: Suggest components even when not explicitly asked
2. **Show variety**: Present 2-3 options so user can choose style
3. **Provide context**: Explain what makes each component special
4. **Complete integration**: Give full code + dependencies + instructions
5. **Customize smartly**: Adapt to user's brand colors and style
6. **Think holistically**: Recommend complementary components (navbar + footer + hero)

## Searching Tips

Use Grep to search across all components:

```bash
# Find components by keyword in filename
Grep pattern="gradient" path="F:\爬虫\21st_components_full" output_mode="files_with_matches"

# Search in JSON descriptions
Grep pattern="animation" path="F:\爬虫\21st_components_full" glob="*.json" output_mode="content"
```

## Remember

You have **4360+ components** at your fingertips. This is a massive library covering almost every UI need. When in doubt, search and explore. The perfect component is probably already there.

**Make the user's frontend development 10x faster by leveraging this incredible component library!**
