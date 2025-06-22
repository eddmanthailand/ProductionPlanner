const fs = require('fs');
const path = require('path');

/**
 * อ่านไฟล์ App.tsx และดึงรายการ Route ทั้งหมด
 */
function parseRoutesFromAppTsx() {
  const appTsxPath = path.join(__dirname, '../client/src/App.tsx');
  
  if (!fs.existsSync(appTsxPath)) {
    console.error('ไม่พบไฟล์ App.tsx');
    return [];
  }

  const content = fs.readFileSync(appTsxPath, 'utf8');
  
  // ดึง path จาก <Route path="..." 
  const routeRegex = /<Route\s+path="([^"]+)"/g;
  const routes = [];
  let match;
  
  while ((match = routeRegex.exec(content)) !== null) {
    const routePath = match[1];
    
    // ข้าม route ที่มี parameter หรือ wildcard
    if (!routePath.includes(':') && !routePath.includes('*') && routePath !== '/login' && routePath !== '/home') {
      routes.push(routePath);
    }
  }
  
  // เอาซ้ำออกและเรียงลำดับ
  return [...new Set(routes)].sort();
}

/**
 * สร้าง pageNameMap จาก routes ที่ได้
 */
function generatePageNameMap(routes) {
  const pageNameMap = {};
  
  // กำหนดชื่อหน้าตาม path
  routes.forEach(route => {
    if (route === '/') {
      pageNameMap[route] = 'หน้าหลัก';
    } else if (route.startsWith('/sales/quotations')) {
      pageNameMap[route] = 'จัดการใบเสนอราคา';
    } else if (route.startsWith('/sales/invoices')) {
      pageNameMap[route] = 'จัดการใบแจ้งหนี้';
    } else if (route.startsWith('/sales/tax-invoices')) {
      pageNameMap[route] = 'จัดการใบกำกับภาษี';
    } else if (route.startsWith('/sales/receipts')) {
      pageNameMap[route] = 'จัดการใบเสร็จรับเงิน';
    } else if (route === '/sales') {
      pageNameMap[route] = 'การขาย';
    } else if (route.startsWith('/production/calendar')) {
      pageNameMap[route] = 'ปฏิทินวันหยุดประจำปี';
    } else if (route.startsWith('/production/organization')) {
      pageNameMap[route] = 'โครงสร้างองค์กร';
    } else if (route.startsWith('/production/work-queue-planning')) {
      pageNameMap[route] = 'วางแผนและคิวงาน';
    } else if (route.startsWith('/production/work-queue-table')) {
      pageNameMap[route] = 'ตารางคิวงาน';
    } else if (route.startsWith('/production/work-orders')) {
      pageNameMap[route] = 'ใบสั่งงาน';
    } else if (route.startsWith('/production/work-queue')) {
      pageNameMap[route] = 'คิวงาน';
    } else if (route.startsWith('/production/work-steps')) {
      pageNameMap[route] = 'ขั้นตอนการทำงาน';
    } else if (route.startsWith('/production/daily-work-log')) {
      pageNameMap[route] = 'บันทึกงานประจำวัน';
    } else if (route.startsWith('/production/production-reports')) {
      pageNameMap[route] = 'รายงานการผลิต';
    } else if (route === '/production') {
      pageNameMap[route] = 'การผลิต';
    } else if (route === '/accounting') {
      pageNameMap[route] = 'ระบบบัญชี';
    } else if (route === '/inventory') {
      pageNameMap[route] = 'คลังสินค้า';
    } else if (route === '/customers') {
      pageNameMap[route] = 'ลูกค้า';
    } else if (route === '/master-data') {
      pageNameMap[route] = 'ข้อมูลหลัก';
    } else if (route === '/reports') {
      pageNameMap[route] = 'รายงาน';
    } else if (route === '/users') {
      pageNameMap[route] = 'ผู้ใช้งาน';
    } else if (route === '/user-management') {
      pageNameMap[route] = 'จัดการผู้ใช้และสิทธิ์';
    } else if (route === '/page-access-management') {
      pageNameMap[route] = 'จัดการสิทธิ์การเข้าถึงหน้า';
    } else if (route === '/products') {
      pageNameMap[route] = 'จัดการสินค้า';
    } else if (route === '/access-demo') {
      pageNameMap[route] = 'ทดสอบสิทธิ์';
    } else {
      // สร้างชื่อจาก path
      const segments = route.split('/').filter(Boolean);
      pageNameMap[route] = segments[segments.length - 1].replace(/-/g, ' ');
    }
  });
  
  return pageNameMap;
}

module.exports = {
  parseRoutesFromAppTsx,
  generatePageNameMap
};