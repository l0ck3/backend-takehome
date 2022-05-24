import { Processor, Process, OnQueueActive } from '@nestjs/bull';
import { Job } from 'bull';
import axios from 'axios';

@Processor('notifications')
export class NotificationsProcessor {
  @Process('notification-job')
  async sendNotification(job: Job<unknown>) {
    const url = 'http://localhost:8080';
    axios.post(url, job.data);
  }
}
