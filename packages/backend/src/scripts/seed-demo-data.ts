import pool from '../db';
import { seedTestAccount, DEFAULT_TEST_ACCOUNT_EMAIL } from '../services/testAccountService';
import userService from '../services/userService';
import { seedDemoProject } from '../services/demoDataService';

// Local convenience script mirroring the /api/admin/seed-demo-data endpoint,
// for generating screenshot-ready demo data without a running server.
async function main() {
  const email = (process.env.TEST_ACCOUNT_EMAIL || DEFAULT_TEST_ACCOUNT_EMAIL).toLowerCase();

  await seedTestAccount({
    email,
    password: process.env.TEST_ACCOUNT_PASSWORD,
    resetPassword: process.env.TEST_ACCOUNT_RESET_PASSWORD,
  });

  const user = await userService.getUserByEmail(email);
  if (!user) {
    throw new Error(`No account found for ${email} after seeding.`);
  }

  const result = await seedDemoProject(user.id, user.email, process.env.DEMO_PROJECT_NAME);
  console.log(`Seeded demo project "${result.projectName}" (${result.testResultCount} test results) for ${user.email}.`);
}

main()
  .catch((err) => {
    console.error('Failed to seed demo data:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
