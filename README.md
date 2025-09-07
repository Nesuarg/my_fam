# Samtræ for Fabricius Familien

A digital family tree application displaying the genealogy and history of the Fabricius family.

🌳 **Live Site**: [samtrae-fabricius.netlify.app](https://samtrae-fabricius.netlify.app)

## About

This application provides an interactive way to explore the Fabricius family lineage, featuring:

- **Interactive Family Tree**: Browse through generations of the Fabricius family
- **Detailed Person Profiles**: View biographical information, dates, and relationships
- **Rich Genealogical Data**: Birth/death dates, locations, occupations, and life events
- **Relationship Mapping**: Explore connections between family members
- **Historical Documentation**: Sources and notes for genealogical research

## Tech Stack

Built with modern web technologies:
- **Astro** - Static site generation with islands architecture
- **React** - Interactive components and islands
- **TypeScript** - Type-safe family tree data structures
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Beautiful, accessible UI components

## Development

```sh
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Family Data Structure

The application uses a comprehensive TypeScript type system for modeling family relationships, supporting:
- Multiple marriages and partnerships
- Flexible date handling (partial dates, estimated dates)
- Rich biographical information
- Privacy controls for living family members
- Data validation and integrity checking

See `/src/types/family.ts` for the complete type definitions.

---

*Preserving the Fabricius family history for future generations.*
