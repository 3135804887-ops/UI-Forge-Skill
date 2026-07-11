# Contributing to UI Forge

Thanks for your interest in contributing to UI Forge! This document provides guidelines for contributing to the project.

## How to Contribute

### Reporting Issues

If you find a bug or have a suggestion:

1. Check if the issue already exists in [Issues](https://github.com/YOUR_USERNAME/ui-forge-skill/issues)
2. If not, create a new issue with:
   - Clear title and description
   - Steps to reproduce (for bugs)
   - Expected vs actual behavior
   - Your environment (OS, Claude version)

### Improving Documentation

Documentation improvements are always welcome:

- Fix typos or unclear explanations
- Add examples or usage scenarios
- Improve installation instructions
- Translate documentation

Submit changes via pull request.

### Adding Components

To add new components to the library:

1. Create component files following the structure:
   ```
   category/
   ├── component-name.json          # Metadata
   ├── component-name_code_0.txt    # Usage example
   └── component-name_code_1.txt    # Implementation
   ```

2. JSON structure:
   ```json
   {
     "url": "component-source-url",
     "title": "Component Title",
     "description": "What the component does",
     "category": "button",
     "code_blocks": ["Usage.tsx", "Component.tsx"],
     "scraped_at": "2026-07-11T..."
   }
   ```

3. Code files should be:
   - Production-ready
   - Well-commented
   - TypeScript preferred
   - Following modern React patterns

### Improving the Skill

To improve the skill instructions (`SKILL.md`):

1. Test your changes thoroughly
2. Ensure backward compatibility
3. Update examples if needed
4. Document any new features

## Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/ui-forge-skill.git
   cd ui-forge-skill
   ```

3. Create a branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. Make your changes

5. Test the skill:
   ```bash
   # Copy to Claude skills directory
   cp -r . ~/.claude/skills/ui-forge-test
   ```

6. Commit your changes:
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

7. Push and create a pull request:
   ```bash
   git push origin feature/your-feature-name
   ```

## Pull Request Guidelines

When submitting a PR:

- **Clear description**: Explain what and why
- **One feature per PR**: Keep changes focused
- **Test thoroughly**: Ensure nothing breaks
- **Update docs**: If behavior changes, update README
- **Follow style**: Match existing code style

## Code Style

- Use clear, descriptive names
- Comment complex logic
- Keep files under 500 lines
- Use TypeScript when possible
- Follow React best practices

## Component Quality Standards

Components should be:

- ✅ **Accessible**: ARIA labels, keyboard navigation
- ✅ **Responsive**: Mobile-first design
- ✅ **Type-safe**: TypeScript definitions
- ✅ **Documented**: Usage examples included
- ✅ **Tested**: Works in major browsers
- ✅ **Clean**: No console errors or warnings

## Review Process

1. Submit PR
2. Maintainers review within 1 week
3. Address feedback if any
4. Once approved, PR is merged
5. Changes appear in next release

## Community

- Be respectful and constructive
- Help others in issues/discussions
- Share examples and use cases
- Spread the word!

## Questions?

Open an issue with the `question` label or start a discussion.

---

Thank you for contributing to UI Forge! 🎉
