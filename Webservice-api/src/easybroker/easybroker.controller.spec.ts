import { Test, TestingModule } from '@nestjs/testing';
import { EasybrokerController } from './easybroker.controller';

describe('EasybrokerController', () => {
  let controller: EasybrokerController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EasybrokerController],
    }).compile();

    controller = module.get<EasybrokerController>(EasybrokerController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
