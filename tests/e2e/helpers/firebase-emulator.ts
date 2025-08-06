/**
 * Helper functions to interact with Firebase emulators during E2E tests
 * This allows us to test the complete flow including email verification
 */

interface EmulatorEmail {
  to: string[];
  from: string;
  subject: string;
  body: string;
  html?: string;
}

/**
 * Get emails sent by Firebase Auth emulator
 * Firebase Auth emulator exposes sent emails at http://localhost:9099/emulator/v1/projects/{projectId}/emails
 */
export async function getEmulatorEmails(projectId: string = 'eth-prod-de36f'): Promise<EmulatorEmail[]> {
  try {
    const response = await fetch(`http://localhost:9099/emulator/v1/projects/${projectId}/emails`);
    if (!response.ok) {
      console.error('Failed to fetch emulator emails:', response.statusText);
      return [];
    }
    const data = await response.json();
    return data.emails || [];
  } catch (error) {
    console.error('Error fetching emulator emails:', error);
    return [];
  }
}

/**
 * Get the most recent email sent to a specific address
 */
export async function getLatestEmailTo(emailAddress: string): Promise<EmulatorEmail | null> {
  const emails = await getEmulatorEmails();
  const userEmails = emails.filter(email => 
    email.to.includes(emailAddress)
  ).sort((a, b) => {
    // Sort by most recent first (assuming emails have timestamps)
    return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
  });
  
  return userEmails[0] || null;
}

/**
 * Extract magic link from passwordless email
 */
export function extractMagicLink(emailBody: string): string | null {
  // Look for Firebase Auth action links
  const linkPattern = /https?:\/\/[^\s<>"]+(?:mode=signIn|mode=verifyEmail)[^\s<>"]*/gi;
  const matches = emailBody.match(linkPattern);
  return matches ? matches[0] : null;
}

/**
 * Clear all emails in the emulator (useful for test cleanup)
 */
export async function clearEmulatorEmails(projectId: string = 'eth-prod-de36f'): Promise<void> {
  try {
    await fetch(`http://localhost:9099/emulator/v1/projects/${projectId}/emails`, {
      method: 'DELETE'
    });
  } catch (error) {
    console.error('Error clearing emulator emails:', error);
  }
}

/**
 * Wait for an email to be sent to a specific address
 */
export async function waitForEmail(
  emailAddress: string, 
  maxWaitTime: number = 10000
): Promise<EmulatorEmail | null> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitTime) {
    const email = await getLatestEmailTo(emailAddress);
    if (email) {
      return email;
    }
    
    // Wait a bit before checking again
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return null;
}

/**
 * Get user data from Firestore emulator
 */
export async function getFirestoreUser(userId: string): Promise<any> {
  try {
    const response = await fetch(
      `http://localhost:8080/emulator/v1/projects/eth-prod-de36f/databases/(default)/documents/users/${userId}`
    );
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching Firestore user:', error);
    return null;
  }
}