import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    scenario_a: {
      executor: 'constant-arrival-rate',
      rate: 6000,         // 6000 iterations/sec for scenario A
      timeUnit: '1s',
      duration: '40m',
      preAllocatedVUs: 3000,
      maxVUs: 10000,
      startTime: '0s',
      gracefulStop: '30s',
    },
    scenario_b: {
      executor: 'constant-arrival-rate',
      rate: 6000,         // 6000 iterations/sec for scenario B
      timeUnit: '1s',
      duration: '40m',
      preAllocatedVUs: 3000,
      maxVUs: 10000,
      startTime: '0s',
      gracefulStop: '30s',
    },
  },
  thresholds: {
    'http_req_failed': ['rate<0.05'],
  },
};

// warm-up / steady / cool-down multipliers (5m warm-up, 30m steady, 5m cool-down)
const START = Date.now();
function phaseMultiplier() {
  const elapsed = Math.floor((Date.now() - START) / 1000);
  if (elapsed < 300) return 0.10 + 0.90 * (elapsed / 300);    // 0->5m ramp 10%->100%
  if (elapsed < 2100) return 1.0;                            // 5m->35m steady
  if (elapsed < 2400) return 1.0 - 0.90 * ((elapsed - 2100) / 300); // 35m->40m cool-down 100%->10%
  return 0.10;
}

export default function () {
  // Determine which scenario invoked this VU by reading __VU and options is not directly accessible,
  // so gate requests probabilistically using the phase multiplier to simulate warm-up/cool-down.
  const mult = phaseMultiplier();

  // Scenario A endpoint (each scenario's executor will trigger iterations independently)
  if (__ITER % 1 === 0) {
    if (Math.random() <= mult) {
      const res = http.get('https://your.api/endpointA');
      check(res, { 'A 2xx': (r) => r.status >= 200 && r.status < 300 });
    }
  }

  // Scenario B endpoint
  if (Math.random() <= mult) {
    const res2 = http.get('https://your.api/endpointB');
    check(res2, { 'B 2xx': (r) => r.status >= 200 && r.status < 300 });
  }
}

