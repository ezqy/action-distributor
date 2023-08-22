import * as main from '../src/main';
import * as fs from 'fs';
import * as path from 'path';
import * as core from '@actions/core';

describe('main tests', () => {
  const inputs = {} as any;
  let setOutputSpy: jest.SpyInstance;
  let inSpy: jest.SpyInstance;

  beforeEach(() => {
    const tmpDir = path.join(process.cwd(), 'tmp');
    if (fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true });
    }
    setOutputSpy = jest.spyOn(core, 'setOutput');
    setOutputSpy.mockImplementation(() => {});
    inSpy = jest.spyOn(core, 'getInput');
    inSpy.mockImplementation(name => inputs[name]);
  })

  it('exec', async() => {
    inputs['repo'] = process.env.repo
    inputs['config'] = '.action-distributor/config.json'
    await main.run();
    expect(setOutputSpy).toHaveBeenCalledWith('url', expect.any(String));
  });
}); 