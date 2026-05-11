
import { User, Student, ChatMessage, Academy } from '../types';
import { StorageService } from './storage';

export const NotificationService = {
  /**
   * Simulates sending an email notification to all relevant users when a new message is posted.
   * In a real production environment, this would call a backend API (e.g., Express/Node.js) 
   * which would use a service like SendGrid, Mailgun, or AWS SES to send actual emails.
   */
  notifyNewMuralMessage: async (message: ChatMessage, academy: Academy) => {
    const allUsers = StorageService.getUsers(academy.id);
    const recipients = allUsers.filter(u => u.id !== message.senderId && u.email);

    console.log(`[Email Simulation] Sending mural notification for academy: ${academy.name}`);
    console.log(`[Email Simulation] Message from: ${message.senderName} (${message.senderRole})`);
    console.log(`[Email Simulation] Content: ${message.content.substring(0, 50)}${message.content.length > 50 ? '...' : ''}`);
    console.log(`[Email Simulation] Recipients: ${recipients.length} users`);
    
    // In a real app, you would do something like:
    // await fetch('/api/notifications/mural', {
    //   method: 'POST',
    //   body: JSON.stringify({ messageId: message.id, academyId: academy.id })
    // });

    recipients.forEach(user => {
      console.log(`[Email Simulation] Email sent to: ${user.email}`);
    });

    return true;
  }
};
