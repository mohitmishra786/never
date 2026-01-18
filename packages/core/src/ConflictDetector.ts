/**
 * ConflictDetector - Detects conflicting rules before sync
 * Prevents injecting rules that conflict with existing instructions
 */

export interface Conflict {
    newRule: string;
    existingLine: string;
    lineNumber: number;
    similarity: number;
}

/**
 * Keywords that might indicate conflicting instructions
 */
const CONFLICT_KEYWORDS = [
    'always', 'never', 'must', 'should', 'do not', "don't", 'avoid',
    'use', 'prefer', 'require', 'mandatory', 'forbidden', 'prohibited'
];

/**
 * ConflictDetector class for finding rule conflicts
 */
export class ConflictDetector {
    /**
     * Tokenize a string for comparison
     */
    private tokenize(text: string): Set<string> {
        return new Set(
            text.toLowerCase()
                .replace(/[^\w\s]/g, ' ')
                .split(/\s+/)
                .filter(word => word.length > 2)
        );
    }

    /**
     * Calculate Jaccard similarity between two token sets
     */
    private calculateSimilarity(set1: Set<string>, set2: Set<string>): number {
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);

        if (union.size === 0) return 0;
        return intersection.size / union.size;
    }

    /**
     * Check if a line contains instruction keywords
     */
    private isInstructionLine(line: string): boolean {
        const lower = line.toLowerCase();
        return CONFLICT_KEYWORDS.some(keyword => lower.includes(keyword));
    }

    /**
     * Extract content outside the Never markers
     */
    extractNonNeverContent(content: string): string {
        const startMarker = '<!-- NEVER-RULES-START -->';
        const endMarker = '<!-- NEVER-RULES-END -->';

        const lines = content.split('\n');
        const result: string[] = [];
        let insideMarker = false;

        for (const line of lines) {
            if (line.includes(startMarker)) {
                insideMarker = true;
                continue;
            }
            if (line.includes(endMarker)) {
                insideMarker = false;
                continue;
            }
            if (!insideMarker) {
                result.push(line);
            }
        }

        return result.join('\n');
    }

    /**
     * Detect potential conflicts between new rules and existing content
     */
    detectConflicts(
        existingContent: string,
        newRules: string[],
        similarityThreshold: number = 0.4
    ): Conflict[] {
        const conflicts: Conflict[] = [];
        const startMarker = '<!-- NEVER-RULES-START -->';
        const endMarker = '<!-- NEVER-RULES-END -->';
        const lines = existingContent.split('\n');
        let insideMarker = false;

        for (const newRule of newRules) {
            const ruleTokens = this.tokenize(newRule);

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Track marker regions
                if (line.includes(startMarker)) {
                    insideMarker = true;
                    continue;
                }
                if (line.includes(endMarker)) {
                    insideMarker = false;
                    continue;
                }
                
                // Skip lines inside markers
                if (insideMarker) {
                    continue;
                }

                const trimmedLine = line.trim();

                // Skip empty lines or lines without instruction keywords
                if (!trimmedLine || !this.isInstructionLine(trimmedLine)) {
                    continue;
                }

                const lineTokens = this.tokenize(trimmedLine);
                const similarity = this.calculateSimilarity(ruleTokens, lineTokens);

                if (similarity >= similarityThreshold) {
                    conflicts.push({
                        newRule,
                        existingLine: trimmedLine,
                        lineNumber: i + 1,
                        similarity,
                    });
                }
            }
        }

        return conflicts;
    }

    /**
     * Filter out conflicting rules and return safe ones
     */
    filterConflictingRules(
        existingContent: string,
        newRules: string[],
        similarityThreshold: number = 0.4
    ): { safe: string[]; skipped: Conflict[] } {
        const conflicts = this.detectConflicts(existingContent, newRules, similarityThreshold);
        const conflictingRules = new Set(conflicts.map(c => c.newRule));

        return {
            safe: newRules.filter(rule => !conflictingRules.has(rule)),
            skipped: conflicts,
        };
    }

    /**
     * Format conflicts for display
     */
    formatConflicts(conflicts: Conflict[]): string {
        if (conflicts.length === 0) {
            return 'No conflicts detected.';
        }

        const lines: string[] = ['Potential conflicts detected:'];

        for (const conflict of conflicts) {
            lines.push('');
            lines.push(`  New rule: "${conflict.newRule}"`);
            lines.push(`  Conflicts with (line ${conflict.lineNumber}): "${conflict.existingLine}"`);
            lines.push(`  Similarity: ${(conflict.similarity * 100).toFixed(0)}%`);
        }

        return lines.join('\n');
    }
}

/**
 * Create a ConflictDetector instance
 */
export function createConflictDetector(): ConflictDetector {
    return new ConflictDetector();
}
