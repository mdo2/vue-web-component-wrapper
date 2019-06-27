import { toKebabCase, toCamelCase } from './strings';

describe('#toKebabCase', () => {
	it(`should convert camel case to kebab case`, () => {
		expect(toKebabCase('testName')).toEqual('test-name');
	});

	it(`should convert long camel case strings to kebab case`, () => {
		expect(toKebabCase('testingMyCamelCaseString')).toEqual('testing-my-camel-case-string');
	});
});

describe('#toCamelCase', () => {
	it(`should kebab case to camel case`, () => {
		expect(toCamelCase('test-name')).toEqual('testName');
	});

	it(`should convert long kebab case strings to camel case`, () => {
		expect(toCamelCase('testing-my-camel-case-string')).toEqual('testingMyCamelCaseString');
	});
});
