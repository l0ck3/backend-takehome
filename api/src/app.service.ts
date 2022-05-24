import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { set, differenceInMilliseconds, add } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';

// One scheduled at T + 2 min
// Two scheduled on the same Day than Day(T), sent each at random times picked between 7 and 9PM in the user's timeZone (those are skipped if this timeframe is already past).
// Two at Day Day(T) + 1, sent each at random times picked between 8AM and 12PM.

@Injectable()
export class AppService {
  constructor(
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  registerNotification(task): void {
    const now = new Date();

    const intervals = [
      {
        date: add(now, { minutes: 2 }).toUTCString(),
        delay: 2 * 60 * 1000,
      },
      this.generateInterval(19, 21, 0, task.timeZone),
      this.generateInterval(19, 21, 0, task.timeZone),
      this.generateInterval(20, 0, 0, task.timeZone),
      this.generateInterval(19, 0, 0, task.timeZone),
    ];

    intervals.forEach((interval) => {
      if (interval.delay > 0) {
        this.notificationsQueue.add(
          'notification-job',
          {
            ...task,
            scheduledDate: interval.date,
          },
          {
            delay: interval.delay,
          },
        );
      }
    });
  }

  private generateInterval = (
    startHour,
    endHour,
    daysFromToday,
    timezone,
  ): { date: string; delay: number } => {
    const lowerBound = this.dateAt(daysFromToday, startHour);
    const upperBound = this.dateAt(daysFromToday, endHour);

    const randomDate = this.generateRandomDate(lowerBound, upperBound);
    const delay = this.getDelay(randomDate, timezone);

    return {
      date: randomDate.toISOString(),
      delay,
    };
  };

  private getDelay = (setDate: Date, timezone: string): number => {
    const setDateUTC = zonedTimeToUtc(setDate, timezone);
    const diff = differenceInMilliseconds(setDateUTC, new Date());

    return diff;
  };

  private dateAt = (daysFromToday: number, hours: number): Date => {
    const today = new Date();

    const setHour = set(today, {
      hours: hours,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });

    const setDay = add(setHour, { days: daysFromToday });

    return setDay;
  };

  private generateRandomDate = (start, end): Date => {
    return new Date(
      start.getTime() + Math.random() * (end.getTime() - start.getTime()),
    );
  };
}
