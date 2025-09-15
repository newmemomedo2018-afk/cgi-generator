import {
  users,
  projects,
  transactions,
  type User,
  type UpsertUser,
  type Project,
  type InsertProject,
  type Transaction,
  type InsertTransaction,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (for JWT Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: { email: string; password: string; firstName?: string; lastName?: string; credits?: number }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<void>;
  updateUserCredits(id: string, credits: number): Promise<void>;
  
  // Project operations
  createProject(project: Omit<InsertProject, "id"> & { userId: string; creditsUsed: number; status?: string }): Promise<Project>;
  getProject(id: string): Promise<Project | undefined>;
  getUserProjects(userId: string): Promise<Project[]>;
  updateProject(id: string, updates: Partial<Project>): Promise<void>;
  
  // Transaction operations
  createTransaction(transaction: Omit<InsertTransaction, "id"> & { userId: string }): Promise<Transaction>;
  getUserTransactions(userId: string): Promise<Transaction[]>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getAllProjects(): Promise<Project[]>;
  getPlatformStats(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: { email: string; password: string; firstName?: string; lastName?: string; credits?: number }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        credits: userData.credits || 5,
      })
      .returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updateUserCredits(id: string, credits: number): Promise<void> {
    await db
      .update(users)
      .set({ credits, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  // Project operations
  async createProject(projectData: Omit<InsertProject, "id"> & { userId: string; creditsUsed: number; status?: string }): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(projectData as any)
      .returning();
    return project;
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id));
    return project;
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt));
  }

  async updateProject(id: string, updates: Partial<Project>): Promise<void> {
    await db
      .update(projects)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(projects.id, id));
  }

  // Transaction operations
  async createTransaction(transactionData: Omit<InsertTransaction, "id"> & { userId: string }): Promise<Transaction> {
    const [transaction] = await db
      .insert(transactions)
      .values(transactionData)
      .returning();
    return transaction;
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    return await db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }

  async getAllProjects(): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .orderBy(desc(projects.createdAt));
  }

  async getPlatformStats(): Promise<any> {
    const [userCount] = await db.select({ count: count() }).from(users);
    const [projectCount] = await db.select({ count: count() }).from(projects);
    const [transactionCount] = await db.select({ count: count() }).from(transactions);
    
    const [completedProjects] = await db
      .select({ count: count() })
      .from(projects)
      .where(eq(projects.status, 'completed'));
    
    return {
      totalUsers: userCount?.count || 0,
      totalProjects: projectCount?.count || 0,
      completedProjects: completedProjects?.count || 0,
      totalTransactions: transactionCount?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
