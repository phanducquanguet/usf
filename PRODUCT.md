# Product

## Register

product

## Users

Small teams (developers, PMs, operators) running day-to-day task management where AI agents are first-class teammates. Users are in a work flow — triaging issues, assigning agents, reviewing runs — usually many hours a day, on web and desktop (Electron), in Vietnamese or English.

## Product Purpose

Multica is an AI-native task management platform: agents can own issues, comment, and change status alongside humans. Success = the tool disappears into the task; a team coordinates humans + agents without friction.

## Brand Personality

Restrained, precise, trustworthy. The interface stays neutral; color appears only as signal (status, brand, error). "克制即高级" — restraint reads as quality.

## Anti-references

- Decorative color, hardcoded Tailwind palette values, gradient chrome.
- SaaS-dashboard clichés: hero metrics, glassmorphism, orchestrated load animations.
- Strangeness without purpose — custom controls where shadcn/Base UI standards exist.

## Design Principles

1. Subtraction by default — every element must justify its existence; whitespace is design.
2. Hierarchy through grayscale; color is semantic signal only (max 2–3 semantic colors per screen).
3. Consistency over personality — same interaction, same feedback, driven by tokens not hardcoded values.
4. Max 3 text hierarchy levels per screen; 3-core-size type discipline.
5. Every change verified in both light and dark mode.

## Accessibility & Inclusion

WCAG AA as the working bar (4.5:1 body text contrast). Full keyboard navigation for menus and dialogs; Vietnamese + English UI copy parity; reduced-motion respected (sidebar already gates spring animation on `useReducedMotion`).
