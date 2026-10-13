import { Module } from '@nestjs/common';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CoPurchaseService } from './co-purchase.service';
import {
  PublishedSaleTermsController,
  PurchaseProposalsController,
  SaleTermsController,
  StaffCoPurchaseController,
  StaffPurchaseProposalsController,
} from './offers.controller';
import { PurchaseProposalsService } from './purchase-proposals.service';
import { SaleTermsService } from './sale-terms.service';

@Module({
  imports: [AuthorizationModule],
  controllers: [
    SaleTermsController,
    PublishedSaleTermsController,
    PurchaseProposalsController,
    StaffPurchaseProposalsController,
    StaffCoPurchaseController,
  ],
  providers: [SaleTermsService, PurchaseProposalsService, CoPurchaseService],
})
export class OffersModule {}
