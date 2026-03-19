export type NotificationType =
  | "document_expiry"  
  | "delayed_trip"      
  | "unassigned_order"; 

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  createdAt: string; 
  read: boolean;
  entityId?: string;
}