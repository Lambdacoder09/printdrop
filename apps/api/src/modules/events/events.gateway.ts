import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { SocketEvents } from '@printdrop/shared';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(SocketEvents.SHOP_JOIN)
  handleShopJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { shopId: string }) {
    if (data?.shopId) {
      const room = `shop:${data.shopId}`;
      client.join(room);
      this.logger.log(`Socket ${client.id} joined shop room ${room}`);
      return { event: 'joined', room };
    }
  }

  @SubscribeMessage(SocketEvents.CUSTOMER_JOIN)
  handleCustomerJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { jobId: string }) {
    if (data?.jobId) {
      const room = `job:${data.jobId}`;
      client.join(room);
      this.logger.log(`Socket ${client.id} joined job room ${room}`);
      return { event: 'joined', room };
    }
  }

  emitToShop(shopId: string, event: string, payload: any) {
    if (this.server) {
      this.server.to(`shop:${shopId}`).emit(event, payload);
    }
  }

  emitToJob(jobId: string, event: string, payload: any) {
    if (this.server) {
      this.server.to(`job:${jobId}`).emit(event, payload);
    }
  }
}
