/**
 * DNS Challenge Provider Interface
 */

export interface DNSProvider {
  /**
   * Provider name
   */
  name: string;

  /**
   * Create a TXT record for ACME DNS-01 challenge
   */
  createTxtRecord(domain: string, name: string, value: string): Promise<void>;

  /**
   * Delete a TXT record
   */
  deleteTxtRecord(domain: string, name: string): Promise<void>;

  /**
   * Check if a TXT record exists
   */
  hasTxtRecord(domain: string, name: string, value: string): Promise<boolean>;
}
