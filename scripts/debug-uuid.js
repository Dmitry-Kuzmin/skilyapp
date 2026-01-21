
import { v5 as uuidv5 } from 'uuid';
const NAMESPACES = {
    CUSTOM: '1b671a64-40d5-491e-99b0-da01ff1f3341',
    URL: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
    DNS: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    OID: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
    X500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8'
};
const testId = 'topic-02_test-002';
const qNum = 1;
const expected = '5368618b-c2e9-4617-8395-b74a719446ed';

for (const [name, ns] of Object.entries(NAMESPACES)) {
    const res = uuidv5(`${testId}_q-${qNum}`, ns);
    console.log(`${name}: ${res} ${res === expected ? 'MATCH!' : ''}`);
}
