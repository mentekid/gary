import * as fs from 'fs/promises';
import * as path from 'path';

export interface ValidationResult {
  isValid: boolean;
  warning: string | null;
}

export class VaultValidator {
  async validateVault(vaultPath: string): Promise<ValidationResult> {
    // Check for CAMPAIGN.md in vault root
    const campaignPath = path.join(vaultPath, 'CAMPAIGN.md');

    try {
      await fs.access(campaignPath);
      // CAMPAIGN.md exists
      return {
        isValid: true,
        warning: null,
      };
    } catch {
      // CAMPAIGN.md does not exist
      const warning = 'No CAMPAIGN.md found in vault root';
      console.warn(`[VaultValidator] ${warning}`);
      return {
        isValid: true, // Still valid, just warn
        warning,
      };
    }
  }
}

// Singleton instance
export const vaultValidator = new VaultValidator();
