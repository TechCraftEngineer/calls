/**
 * Тест для проверки новых транзакционных методов и валидации
 */

import { callsService } from '@calls/db';
import { ValidationError } from '../validation/call-schemas';
import type { CreateCallData } from '@calls/db';

async function testValidation() {
  console.log('🧪 Тестирование валидации...');
  
  try {
    // Тест 1: Невалидный internalNumber
    await callsService.createCall({
      workspaceId: 'ws_123456',
      filename: 'test.mp3',
      internalNumber: 'abc123', // Должен быть только цифры
      timestamp: '2024-01-01T10:00:00Z'
    } as CreateCallData);
    console.log('❌ Тест 1 провален: должна быть ошибка валидации');
  } catch (error) {
    if (error instanceof ValidationError && error.message.includes('только цифры')) {
      console.log('✅ Тест 1 пройден: правильно валидирует internalNumber');
    } else {
      console.log('❌ Тест 1 провален: неверная ошибка', error instanceof Error ? error.message : String(error));
    }
  }
  
  try {
    // Тест 2: Невалидный direction
    await callsService.createCall({
      workspaceId: 'ws_123456',
      filename: 'test.mp3',
      direction: 'invalid', // Должен быть inbound/outbound
      timestamp: '2024-01-01T10:00:00Z'
    } as CreateCallData);
    console.log('❌ Тест 2 провален: должна быть ошибка валидации');
  } catch (error) {
    if (error instanceof ValidationError && error.message.includes('inbound или outbound')) {
      console.log('✅ Тест 2 пройден: правильно валидирует direction');
    } else {
      console.log('❌ Тест 2 провален: неверная ошибка', error instanceof Error ? error.message : String(error));
    }
  }
  
  try {
    // Тест 3: Слишком длинный provider
    await callsService.createCall({
      workspaceId: 'ws_123456',
      filename: 'test.mp3',
      provider: 'a'.repeat(51), // Слишком длинный
      timestamp: '2024-01-01T10:00:00Z'
    } as CreateCallData);
    console.log('❌ Тест 3 провален: должна быть ошибка валидации');
  } catch (error) {
    if (error instanceof ValidationError && error.message.includes('не должен превышать 50 символов')) {
      console.log('✅ Тест 3 пройден: правильно валидирует длину provider');
    } else {
      console.log('❌ Тест 3 провален: неверная ошибка', error instanceof Error ? error.message : String(error));
    }
  }
}

async function testTransactionalUpdates() {
  console.log('\n🔄 Тестирование транзакционных обновлений...');
  
  try {
    // Создадим тестовый звонок
    const callId = await callsService.createCall({
      workspaceId: 'ws_123456',
      filename: 'test-transaction.mp3',
      timestamp: '2024-01-01T10:00:00Z'
    });
    
    console.log(`✅ Звонок создан: ${callId}`);
    
    // Тест 4: Транзакционное обновление с записью
    await callsService.updateCallWithRecording(callId, {
      fileId: '550e8400-e29b-41d4-a716-446655440000',
      enhancedAudioFileId: '550e8400-e29b-41d4-a716-446655440001',
      customerName: 'Тестовый клиент'
    });
    
    console.log('✅ Транзакционное обновление записи пройдено');
    
    // Тест 5: Транзакционное обновление PBX привязки
    await callsService.updateCallPbxBindingWithCustomer(callId, {
      internalNumber: '123',
      source: 'test',
      name: 'Тестовый менеджер',
      customerName: 'Обновленный клиент'
    });
    
    console.log('✅ Транзакционное обновление PBX привязки пройдено');
    
  } catch (error) {
    console.log('❌ Тест транзакционных обновлений провален:', error);
  }
}

async function testUUIDValidation() {
  console.log('\n🆔 Тестирование валидации UUID...');
  
  try {
    // Тест 6: Невалидный callId
    await callsService.updateCallRecording('invalid-uuid', { fileId: null });
    console.log('❌ Тест 6 провален: должна быть ошибка валидации UUID');
  } catch (error) {
    if (error instanceof ValidationError && error.message.includes('валидным UUID')) {
      console.log('✅ Тест 6 пройден: правильно валидирует callId');
    } else {
      console.log('❌ Тест 6 провален: неверная ошибка', error instanceof Error ? error.message : String(error));
    }
  }
  
  try {
    // Тест 7: Невалидный fileId
    await callsService.updateCallRecording('550e8400-e29b-41d4-a716-446655440000', { 
      fileId: 'invalid-uuid' 
    });
    console.log('❌ Тест 7 провален: должна быть ошибка валидации UUID');
  } catch (error) {
    if (error instanceof ValidationError && error.message.includes('валидным UUID')) {
      console.log('✅ Тест 7 пройден: правильно валидирует fileId');
    } else {
      console.log('❌ Тест 7 провален: неверная ошибка', error instanceof Error ? error.message : String(error));
    }
  }
}

// Запуск тестов
async function runTests() {
  console.log('🚀 Запуск тестов улучшенных методов сохранения звонков\n');
  
  await testValidation();
  await testTransactionalUpdates();
  await testUUIDValidation();
  
  console.log('\n✨ Тестирование завершено!');
}

// Экспорт для использования
export { runTests };
