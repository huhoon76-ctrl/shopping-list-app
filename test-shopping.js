const { chromium } = require('playwright');

const URL = 'http://localhost:8765/shopping-list.html';
const results = [];

function log(status, name, detail = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  const line = `${icon} [${status}] ${name}${detail ? ' — ' + detail : ''}`;
  console.log(line);
  results.push({ status, name, detail });
}

async function clearStorage(page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function getItemCount(page) {
  return await page.locator('.item').count();
}

async function getStats(page) {
  return await page.locator('#stats').innerText();
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n=== 쇼핑 리스트 앱 자동 테스트 ===\n');

  // ── TEST 1: 페이지 초기 로드 ──────────────────────────────
  console.log('[ 테스트 1 ] 초기 페이지 로드');
  try {
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await clearStorage(page);
    const title = await page.title();
    const empty = await page.locator('.empty').innerText();
    const stats = await getStats(page);

    title === '쇼핑 리스트'
      ? log('PASS', '페이지 타이틀', title)
      : log('FAIL', '페이지 타이틀', `예상: 쇼핑 리스트, 실제: ${title}`);

    empty.includes('추가')
      ? log('PASS', '빈 상태 메시지 표시')
      : log('FAIL', '빈 상태 메시지 표시', empty);

    stats === '항목 없음'
      ? log('PASS', '초기 통계 표시', stats)
      : log('FAIL', '초기 통계 표시', stats);
  } catch (e) {
    log('FAIL', '초기 로드', e.message);
  }

  // ── TEST 2: 아이템 추가 (버튼 클릭) ──────────────────────
  console.log('\n[ 테스트 2 ] 아이템 추가');
  try {
    await page.locator('#itemInput').fill('사과');
    await page.locator('button:has-text("추가")').click();
    await page.waitForTimeout(200);

    const count = await getItemCount(page);
    const text = await page.locator('.item-text').first().innerText();
    const stats = await getStats(page);

    count === 1
      ? log('PASS', '아이템 1개 추가됨')
      : log('FAIL', '아이템 추가 실패', `count: ${count}`);

    text === '사과'
      ? log('PASS', '추가된 텍스트 정확함', text)
      : log('FAIL', '텍스트 불일치', text);

    stats === '0 / 1 완료'
      ? log('PASS', '통계 업데이트', stats)
      : log('FAIL', '통계 오류', stats);
  } catch (e) {
    log('FAIL', '아이템 추가 (버튼)', e.message);
  }

  // ── TEST 3: 아이템 추가 (Enter 키) ───────────────────────
  console.log('\n[ 테스트 3 ] Enter 키로 추가');
  try {
    await page.locator('#itemInput').fill('바나나');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    const count = await getItemCount(page);
    count === 2
      ? log('PASS', 'Enter 키로 아이템 추가됨', `총 ${count}개`)
      : log('FAIL', 'Enter 키 추가 실패', `count: ${count}`);

    const firstText = await page.locator('.item-text').first().innerText();
    firstText === '바나나'
      ? log('PASS', '최신 항목이 맨 위에 표시됨', firstText)
      : log('FAIL', '순서 오류', firstText);
  } catch (e) {
    log('FAIL', 'Enter 키 추가', e.message);
  }

  // ── TEST 4: 빈 입력 방지 ─────────────────────────────────
  console.log('\n[ 테스트 4 ] 빈 입력 방지');
  try {
    await page.locator('#itemInput').fill('   ');
    await page.locator('button:has-text("추가")').click();
    await page.waitForTimeout(200);

    const count = await getItemCount(page);
    count === 2
      ? log('PASS', '공백만 입력 시 추가 안 됨', `여전히 ${count}개`)
      : log('FAIL', '빈 입력 방지 실패', `count: ${count}`);
  } catch (e) {
    log('FAIL', '빈 입력 방지', e.message);
  }

  // ── TEST 5: 체크 기능 ─────────────────────────────────────
  console.log('\n[ 테스트 5 ] 체크(완료) 기능');
  try {
    const checkbox = page.locator('.item input[type="checkbox"]').first();
    await checkbox.click();
    await page.waitForTimeout(200);

    const isChecked = await checkbox.isChecked();
    const hasCheckedClass = await page.locator('.item.checked').count();
    const stats = await getStats(page);

    isChecked
      ? log('PASS', '체크박스 체크됨')
      : log('FAIL', '체크박스 미체크');

    hasCheckedClass === 1
      ? log('PASS', '.checked 클래스 적용됨')
      : log('FAIL', '.checked 클래스 누락');

    stats === '1 / 2 완료'
      ? log('PASS', '통계 업데이트', stats)
      : log('FAIL', '통계 오류', stats);
  } catch (e) {
    log('FAIL', '체크 기능', e.message);
  }

  // ── TEST 6: 체크 해제 (토글) ──────────────────────────────
  console.log('\n[ 테스트 6 ] 체크 해제 (토글)');
  try {
    const checkbox = page.locator('.item input[type="checkbox"]').first();
    await checkbox.click();
    await page.waitForTimeout(200);

    const isChecked = await checkbox.isChecked();
    const stats = await getStats(page);

    !isChecked
      ? log('PASS', '체크 해제(토글) 작동')
      : log('FAIL', '체크 해제 실패');

    stats === '0 / 2 완료'
      ? log('PASS', '통계 복구', stats)
      : log('FAIL', '통계 오류', stats);
  } catch (e) {
    log('FAIL', '체크 해제', e.message);
  }

  // ── TEST 7: 아이템 삭제 ───────────────────────────────────
  console.log('\n[ 테스트 7 ] 아이템 삭제');
  try {
    const firstText = await page.locator('.item-text').first().innerText();
    await page.locator('.delete-btn').first().click();
    await page.waitForTimeout(200);

    const count = await getItemCount(page);
    count === 1
      ? log('PASS', `"${firstText}" 삭제됨`, `남은 항목: ${count}개`)
      : log('FAIL', '삭제 실패', `count: ${count}`);

    const remaining = await page.locator('.item-text').first().innerText();
    remaining !== firstText
      ? log('PASS', '삭제 후 목록 갱신됨', remaining)
      : log('FAIL', '삭제 후 목록 미갱신');
  } catch (e) {
    log('FAIL', '아이템 삭제', e.message);
  }

  // ── TEST 8: 필터 — 미완료 ─────────────────────────────────
  console.log('\n[ 테스트 8 ] 필터 기능');
  try {
    await page.locator('#itemInput').fill('우유');
    await page.keyboard.press('Enter');
    await page.locator('#itemInput').fill('달걀');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(200);

    await page.locator('.item input[type="checkbox"]').first().click();
    await page.waitForTimeout(200);

    await page.locator('.filter-btn:has-text("미완료")').click();
    await page.waitForTimeout(200);
    const activeCount = await getItemCount(page);

    await page.getByRole('button', { name: '완료', exact: true }).click();
    await page.waitForTimeout(200);
    const doneCount = await getItemCount(page);

    await page.locator('.filter-btn:has-text("전체")').click();
    await page.waitForTimeout(200);
    const allCount = await getItemCount(page);

    activeCount === 2
      ? log('PASS', '미완료 필터', `${activeCount}개 표시`)
      : log('FAIL', '미완료 필터', `예상 2, 실제 ${activeCount}`);

    doneCount === 1
      ? log('PASS', '완료 필터', `${doneCount}개 표시`)
      : log('FAIL', '완료 필터', `예상 1, 실제 ${doneCount}`);

    allCount === 3
      ? log('PASS', '전체 필터', `${allCount}개 표시`)
      : log('FAIL', '전체 필터', `예상 3, 실제 ${allCount}`);
  } catch (e) {
    log('FAIL', '필터 기능', e.message);
  }

  // ── TEST 9: 완료 항목 일괄 삭제 ──────────────────────────
  console.log('\n[ 테스트 9 ] 완료 항목 일괄 삭제');
  try {
    await page.locator('.clear-btn').click();
    await page.waitForTimeout(200);

    const count = await getItemCount(page);
    count === 2
      ? log('PASS', '완료 항목만 삭제됨', `남은 항목: ${count}개`)
      : log('FAIL', '일괄 삭제 오류', `count: ${count}`);
  } catch (e) {
    log('FAIL', '완료 항목 일괄 삭제', e.message);
  }

  // ── TEST 10: localStorage 영속성 ─────────────────────────
  console.log('\n[ 테스트 10 ] localStorage 영속성');
  try {
    const beforeCount = await getItemCount(page);
    await page.reload();
    await page.waitForTimeout(300);
    const afterCount = await getItemCount(page);

    beforeCount === afterCount
      ? log('PASS', '새로고침 후 데이터 유지됨', `${afterCount}개`)
      : log('FAIL', '데이터 유실', `새로고침 전: ${beforeCount}, 후: ${afterCount}`);
  } catch (e) {
    log('FAIL', 'localStorage 영속성', e.message);
  }

  // ── 결과 요약 ────────────────────────────────────────────
  const pass = results.filter(r => r.status === 'PASS').length;
  const fail = results.filter(r => r.status === 'FAIL').length;

  console.log('\n' + '='.repeat(40));
  console.log(`📊 테스트 결과: ${pass} 통과 / ${fail} 실패 / 총 ${results.length}개`);
  console.log('='.repeat(40));

  if (fail > 0) {
    console.log('\n실패 항목:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`  ❌ ${r.name}: ${r.detail}`);
    });
  } else {
    console.log('\n🎉 모든 테스트 통과!');
  }

  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})();