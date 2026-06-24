import { Test, TestingModule } from '@nestjs/testing';
import { EasybrokerService } from './easybroker.service';

describe('EasybrokerService', () => {
  let service: EasybrokerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EasybrokerService],
    }).compile();

    service = module.get<EasybrokerService>(EasybrokerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
