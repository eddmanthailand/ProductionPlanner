import { 
  notifications, 
  notificationRules, 
  userNotificationPreferences,
  workOrders,
  dailyWorkLogs,
  type Notification,
  type InsertNotification,
  type NotificationRule,
  type InsertNotificationRule,
  type UserNotificationPreference,
  type InsertUserNotificationPreference
} from "@shared/schema";
import { db } from "../db";
import { eq, and, isNull, desc, lte, sql } from "drizzle-orm";

export class NotificationService {
  // Create notification
  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(data)
      .returning();
    return notification;
  }

  // Get user notifications
  async getUserNotifications(
    userId: number, 
    tenantId: string, 
    filters?: {
      status?: string;
      type?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Notification[]> {
    const conditions = [
      eq(notifications.userId, userId),
      eq(notifications.tenantId, tenantId)
    ];

    if (filters?.status) {
      conditions.push(eq(notifications.status, filters.status));
    }

    if (filters?.type) {
      conditions.push(eq(notifications.type, filters.type));
    }

    const query = db.query.notifications.findMany({
      where: and(...conditions),
      orderBy: [desc(notifications.createdAt)],
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
      with: {
        user: true
      }
    });

    return await query;
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: number, tenantId: string): Promise<boolean> {
    const [updated] = await db
      .update(notifications)
      .set({ 
        status: 'read',
        readAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId)
      ))
      .returning();

    return !!updated;
  }

  // Mark all notifications as read for user
  async markAllAsRead(userId: number, tenantId: string): Promise<number> {
    const result = await db
      .update(notifications)
      .set({ 
        status: 'read',
        readAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId),
        eq(notifications.status, 'unread')
      ));

    return result.rowCount || 0;
  }

  // Dismiss notification
  async dismissNotification(notificationId: string, userId: number, tenantId: string): Promise<boolean> {
    const [updated] = await db
      .update(notifications)
      .set({ 
        status: 'dismissed',
        dismissedAt: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId)
      ))
      .returning();

    return !!updated;
  }

  // Get unread count
  async getUnreadCount(userId: number, tenantId: string): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.tenantId, tenantId),
        eq(notifications.status, 'unread')
      ));

    return result[0]?.count || 0;
  }

  // Cleanup expired notifications
  async cleanupExpiredNotifications(): Promise<number> {
    const result = await db
      .delete(notifications)
      .where(and(
        lte(notifications.expiresAt, new Date()),
        isNull(notifications.expiresAt, false)
      ));

    return result.rowCount || 0;
  }

  // === NOTIFICATION RULES ===

  // Create notification rule
  async createNotificationRule(data: InsertNotificationRule): Promise<NotificationRule> {
    const [rule] = await db
      .insert(notificationRules)
      .values(data)
      .returning();
    return rule;
  }

  // Get notification rules for tenant
  async getNotificationRules(tenantId: string): Promise<NotificationRule[]> {
    return await db.query.notificationRules.findMany({
      where: eq(notificationRules.tenantId, tenantId),
      with: {
        createdBy: true
      },
      orderBy: [desc(notificationRules.createdAt)]
    });
  }

  // === USER PREFERENCES ===

  // Get user notification preferences
  async getUserPreferences(userId: number, tenantId: string): Promise<UserNotificationPreference[]> {
    return await db.query.userNotificationPreferences.findMany({
      where: and(
        eq(userNotificationPreferences.userId, userId),
        eq(userNotificationPreferences.tenantId, tenantId)
      )
    });
  }

  // Update user preference
  async updateUserPreference(
    userId: number, 
    tenantId: string, 
    notificationType: string, 
    preference: Partial<InsertUserNotificationPreference>
  ): Promise<UserNotificationPreference> {
    // Try to update existing preference
    const [updated] = await db
      .update(userNotificationPreferences)
      .set({ 
        ...preference,
        updatedAt: new Date()
      })
      .where(and(
        eq(userNotificationPreferences.userId, userId),
        eq(userNotificationPreferences.tenantId, tenantId),
        eq(userNotificationPreferences.notificationType, notificationType)
      ))
      .returning();

    if (updated) {
      return updated;
    }

    // Create new preference if doesn't exist
    const [created] = await db
      .insert(userNotificationPreferences)
      .values({
        tenantId,
        userId,
        notificationType,
        ...preference
      })
      .returning();

    return created;
  }

  // === NOTIFICATION GENERATORS ===

  // Generate deadline warning notifications
  async generateDeadlineWarnings(tenantId: string): Promise<number> {
    // Get work orders with delivery dates approaching (next 3 days)
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    const overdueOrders = await db.query.workOrders.findMany({
      where: and(
        eq(workOrders.tenantId, tenantId),
        lte(workOrders.deliveryDate, threeDaysFromNow.toISOString().split('T')[0]),
        eq(workOrders.status, 'in_progress')
      ),
      with: {
        customer: true
      }
    });

    let notificationsCreated = 0;

    for (const order of overdueOrders) {
      // Check if notification already exists for this work order
      const existingNotification = await db.query.notifications.findFirst({
        where: and(
          eq(notifications.tenantId, tenantId),
          eq(notifications.type, 'deadline_warning'),
          eq(notifications.relatedType, 'work_order'),
          eq(notifications.relatedId, order.id),
          eq(notifications.status, 'unread')
        )
      });

      if (!existingNotification) {
        // Create notification for admin users (for now)
        const adminUsers = await db.query.users.findMany({
          where: and(
            eq(db.select().from(db.select().from(db.users)).tenantId, tenantId),
            eq(db.select().from(db.users).roleId, 1) // Admin role
          )
        });

        for (const admin of adminUsers) {
          await this.createNotification({
            tenantId,
            userId: admin.id,
            type: 'deadline_warning',
            title: '⚠️ ใบสั่งงานใกล้กำหนดส่ง',
            message: `ใบสั่งงาน ${order.orderNumber} ของลูกค้า ${order.customer?.name || order.customerName} กำหนดส่ง ${order.deliveryDate}`,
            priority: 'high',
            relatedType: 'work_order',
            relatedId: order.id,
            metadata: {
              orderNumber: order.orderNumber,
              customerName: order.customer?.name || order.customerName,
              deliveryDate: order.deliveryDate
            },
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Expire in 7 days
          });
          notificationsCreated++;
        }
      }
    }

    return notificationsCreated;
  }

  // Generate overdue task notifications
  async generateOverdueNotifications(tenantId: string): Promise<number> {
    // Implementation for overdue tasks
    return 0;
  }
}

export const notificationService = new NotificationService();