import { Injectable } from "@nestjs/common";

@Injectable()
export class AppService {
  getHealth() {
    return {
      name: "student-services-backend",
      status: "ok",
      timestamp: new Date().toISOString()
    };
  }
}
