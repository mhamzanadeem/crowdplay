import {test} from 'node:test';
import assert from 'node:assert/strict';
import {authErrorMessage} from '../../src/lib/auth/errors.ts';
test('database failure is distinguished from missing state and token errors',()=>{assert.match(authErrorMessage('database'),/MongoDB/);assert.match(authErrorMessage('state'),/cookie/);assert.match(authErrorMessage('token'),/callback/)});
test('arbitrary callback parameters never become UI error text',()=>{const input='secret-token-<script>';assert.ok(!authErrorMessage(input).includes(input));assert.match(authErrorMessage(input),/could not be completed/)});
