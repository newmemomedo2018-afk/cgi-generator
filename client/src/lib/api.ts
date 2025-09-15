import { apiRequest } from "./queryClient";

export interface UploadImageResponse {
  url: string;
}

export interface CreateProjectRequest {
  title: string;
  description?: string;
  productImageUrl: string;
  sceneImageUrl: string;
  contentType: "image" | "video";
  resolution?: string;
  quality?: string;
}

export interface CreateProjectResponse {
  id: string;
  status: string;
  progress: number;
}

export class CGIApi {
  static async uploadImage(file: File): Promise<UploadImageResponse> {
    const formData = new FormData();
    formData.append("image", file);
    
    const response = await apiRequest("POST", "/api/upload-image", formData);
    return response.json();
  }

  static async createProject(data: CreateProjectRequest): Promise<CreateProjectResponse> {
    const response = await apiRequest("POST", "/api/projects", data);
    return response.json();
  }

  static async getProject(id: string) {
    const response = await apiRequest("GET", `/api/projects/${id}`);
    return response.json();
  }

  static async getUserProjects() {
    const response = await apiRequest("GET", "/api/projects");
    return response.json();
  }

  static async purchaseCredits(amount: number, credits: number) {
    const response = await apiRequest("POST", "/api/purchase-credits", {
      amount: amount * 100, // Convert to cents
      credits,
    });
    return response.json();
  }
}
