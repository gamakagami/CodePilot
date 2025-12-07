import { Request, Response } from 'express';
import axios from 'axios';
import { EmailJob } from '../types/jobs';
import { Logger } from '../utils/logger';

const logger = new Logger('EmailWebhook');

export async function handleEmail(req: Request, res: Response) {
  const { to, subject, body, template, data, _metadata } = req.body as EmailJob & { _metadata: any };

  logger.processing(`Sending email to: ${to}`);
  
  // DEBUG: Log the full request body
  console.log('📧 DEBUG: Email webhook called with:', JSON.stringify(req.body, null, 2));
  console.log('📧 DEBUG: AUTH_SERVICE_URL:', process.env.AUTH_SERVICE_URL);

  try {
    const emailPayload = {
      to,
      subject,
      body,
      template,
      data,
    };
    
    console.log('📧 DEBUG: Sending to mock service:', emailPayload);
    
    const response = await axios.post(
      `${process.env.AUTH_SERVICE_URL}/api/email/send`,
      emailPayload,
      {
        timeout: 30000,
      }
    );
    
    console.log('📧 DEBUG: Mock service response:', response.data);

    logger.success(`Email sent to: ${to}`);

    res.status(200).json({
      success: true,
      to,
      sentAt: new Date().toISOString(),
    });
  } catch (error: any) {
    // Enhanced error logging
    console.error('📧 DEBUG: Email failed with error:', {
      message: error.message,
      code: error.code,
      response: error.response?.data,
      stack: error.stack
    });
    
    logger.error(`Email failed for: ${to}`, error.message);
    
    res.status(500).json({
      error: 'Email sending failed',
      message: error.message,
      details: error.response?.data || 'No additional details',
      to,
    });
  }
}