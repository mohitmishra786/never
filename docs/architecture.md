# Architecture

*"Make the change easy, then make the easy change."* — Kent Beck

Never follows a straightforward pipeline architecture. Rules flow in, formatted output flows out. There is no state to manage, no caching to invalidate, no incremental builds to debug. Each sync is a complete, predictable transformation.

## System Overview

The system has three layers: input (the rule library), processing (the CLI and engines), and output (the generated files). Data flows in one direction, from source to destination, with no cycles or backflows.

```mermaid
flowchart TB
    subgraph Input["Rule Library"]
        direction TB
        L1["library/core/*.md"]
        L2["library/languages/*.md"]
        L3["library/web/*.md"]
    end

    subgraph Processing["CLI Pipeline"]
        direction TB
        P1["Parser<br/><i>gray-matter</i>"]
        P2["Detector<br/><i>project type</i>"]
        P3["Filter<br/><i>rule selection</i>"]
    end

    subgraph Engines["Sync Engines"]
        direction TB
        E1["to-mdc.ts<br/><i>Cursor format</i>"]
        E2["to-claude.ts<br/><i>CLAUDE.md</i>"]
        E3["to-agents.ts<br/><i>AGENTS.md</i>"]
    end

    subgraph Output["Generated Files"]
        direction TB
        O1[".cursor/rules/*.mdc"]
        O2["CLAUDE.md"]
        O3["AGENTS.md"]
    end

    L1 --> P1
    L2 --> P1
    L3 --> P1
    
    P1 --> P3
    P2 --> P3
    
    P3 --> E1
    P3 --> E2
    P3 --> E3
    
    E1 --> O1
    E2 --> O2
    E3 --> O3

    style Input fill:#1a1a2e,stroke:#4a4a6a,color:#fff
    style Processing fill:#16213e,stroke:#4a4a6a,color:#fff
    style Engines fill:#0f3460,stroke:#4a4a6a,color:#fff
    style Output fill:#1a1a2e,stroke:#4a4a6a,color:#fff
```

## The Parser

Every rule file follows the same structure: YAML frontmatter followed by markdown content. The parser uses `gray-matter` to separate these concerns, producing a `ParsedRule` object that downstream components can work with.

```mermaid
flowchart LR
    subgraph Input["Raw Markdown"]
        A["---<br/>name: Safety<br/>globs: **/*<br/>---<br/># Rules<br/>- Never use eval()"]
    end
    
    subgraph Parser["gray-matter"]
        B["Extract<br/>Frontmatter"]
        C["Extract<br/>Content"]
    end
    
    subgraph Output["ParsedRule"]
        D["frontmatter: {<br/>  name, globs,<br/>  alwaysApply<br/>}"]
        E["rules: [<br/>  'Never use eval()'<br/>]"]
    end
    
    A --> B
    A --> C
    B --> D
    C --> E
    
    style Input fill:#2d2d44,stroke:#5a5a7a,color:#fff
    style Parser fill:#1e3a5f,stroke:#5a5a7a,color:#fff
    style Output fill:#2d2d44,stroke:#5a5a7a,color:#fff
```

The parser also extracts individual rules from the content. It scans for lines starting with `- Never` and collects them into an array. This dual output, both the full markdown and the individual rules, gives engines flexibility in how they format the final output.

## Project Detection

The detector examines the working directory for telltale files. Each check is independent and non destructive, just filesystem reads with graceful fallbacks if files are missing or malformed.

```mermaid
flowchart TD
    subgraph Files["Project Files"]
        F1["tsconfig.json"]
        F2["package.json"]
        F3["pyproject.toml"]
        F4[".cursor/"]
    end
    
    subgraph Detection["Detection Logic"]
        D1{"TypeScript?"}
        D2{"React/Vue/Angular?"}
        D3{"Python?"}
        D4{"Cursor present?"}
    end
    
    subgraph Result["ProjectInfo"]
        R1["hasTypeScript: true"]
        R2["hasReact: true"]
        R3["hasPython: false"]
        R4["frameworks: ['typescript', 'react']"]
    end
    
    F1 --> D1
    F2 --> D2
    F3 --> D3
    F4 --> D4
    
    D1 -->|exists| R1
    D2 -->|deps include react| R2
    D3 -->|not found| R3
    D1 & D2 --> R4
    
    style Files fill:#1a1a2e,stroke:#4a4a6a,color:#fff
    style Detection fill:#16213e,stroke:#4a4a6a,color:#fff
    style Result fill:#0f3460,stroke:#4a4a6a,color:#fff
```

The detection result feeds into rule selection. A TypeScript project automatically includes TypeScript rules. A React project gets React rules. The user can override in config, but sensible defaults mean most projects work without configuration.

## Sync Engine Design

Each engine receives an array of `ParsedRule` objects and produces formatted output for its target tool. The engines share no state and know nothing about each other, they are pure functions that transform data.

```mermaid
flowchart LR
    subgraph Input["ParsedRule[]"]
        I1["rule 1"]
        I2["rule 2"]
        I3["rule n"]
    end
    
    subgraph MDC["to-mdc Engine"]
        M1["Generate frontmatter<br/><i>description, globs, alwaysApply</i>"]
        M2["Format markdown<br/><i>preserve structure</i>"]
        M3["Write .mdc files<br/><i>one per category</i>"]
    end
    
    subgraph Claude["to-claude Engine"]
        C1["Generate header<br/><i>project context</i>"]
        C2["Insert markers<br/><i>NEVER-RULES-START/END</i>"]
        C3["Merge with existing<br/><i>preserve manual edits</i>"]
    end
    
    I1 --> MDC
    I2 --> MDC
    I3 --> MDC
    
    I1 --> Claude
    I2 --> Claude
    I3 --> Claude
    
    style Input fill:#2d2d44,stroke:#5a5a7a,color:#fff
    style MDC fill:#1e3a5f,stroke:#5a5a7a,color:#fff
    style Claude fill:#0f3460,stroke:#5a5a7a,color:#fff
```

The Claude and AGENTS engines use marker comments to preserve manual edits. When updating an existing file, they find the markers, replace only the content between them, and leave everything else untouched. This allows teams to add project specific guidance that survives regeneration.

## Configuration Flow

The config file acts as a filter and toggle mechanism. It does not change how the system works, only what subset of rules and outputs get processed.

```mermaid
flowchart TD
    subgraph Config["config.yaml"]
        C1["rules:<br/>  - core<br/>  - typescript"]
        C2["targets:<br/>  cursor: true<br/>  claude: true"]
        C3["autoDetect: true"]
    end
    
    subgraph Processing["Sync Pipeline"]
        P1["Load all rule sets"]
        P2["Filter by config.rules"]
        P3["Merge auto-detected rules"]
        P4["Generate enabled targets only"]
    end
    
    C1 --> P2
    C2 --> P4
    C3 --> P3
    
    P1 --> P2 --> P3 --> P4
    
    style Config fill:#1a1a2e,stroke:#4a4a6a,color:#fff
    style Processing fill:#16213e,stroke:#4a4a6a,color:#fff
```

## Command Structure

The CLI exposes three commands that map to clear user intentions.

```mermaid
flowchart LR
    subgraph Commands["never CLI"]
        direction TB
        INIT["init<br/><i>create config, detect project</i>"]
        SYNC["sync<br/><i>generate output files</i>"]
        LIST["list<br/><i>show available rules</i>"]
    end
    
    subgraph Effects["Side Effects"]
        E1[".never/config.yaml"]
        E2[".cursor/rules/*.mdc<br/>CLAUDE.md<br/>AGENTS.md"]
        E3["stdout"]
    end
    
    INIT --> E1
    SYNC --> E2
    LIST --> E3
    
    style Commands fill:#16213e,stroke:#4a4a6a,color:#fff
    style Effects fill:#0f3460,stroke:#4a4a6a,color:#fff
```

`init` is run once per project to bootstrap configuration. `sync` is run whenever rules need updating, typically after pulling changes or modifying config. `list` is informational, showing what is available without changing anything.

## Why This Design

The architecture optimizes for understandability over cleverness. Each component does one thing. Data flows in one direction. Side effects are confined to the edges of the system.

This makes debugging trivial. If the output is wrong, you check the parsed rules. If those are wrong, you check the source files. If parsing works but output is wrong, the problem is in the engine. There is nowhere for bugs to hide.

It also makes extension straightforward. Adding a new output format means writing a new engine, not understanding a complex state machine. Adding new rules means dropping a markdown file in the right directory. The system grows linearly with features, not exponentially.

*"Simplicity is prerequisite for reliability."* — Edsger Dijkstra
