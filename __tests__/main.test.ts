import * as main from '../src/main';
const fs = require('fs');
const path = require('path');
import * as core from '@actions/core';

describe('main tests', () => {
  let inputs = {} as any;
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
    inputs['repo'] = process.env['repo']
    inputs['path'] = process.env['path']
    inputs['owner'] = process.env['owner']
    await main.run();
    expect(setOutputSpy).toHaveBeenCalledWith('result', 'success');
  });
}); 