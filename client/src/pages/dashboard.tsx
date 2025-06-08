export default function Dashboard() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">แดชบอร์ด</h1>
        <p className="text-gray-600">ยินดีต้อนรับ! นี่คือสถานการณ์การดำเนินงานในวันนี้</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ยอดขายวันนี้</p>
              <p className="text-2xl font-bold text-gray-900">฿125,430</p>
              <p className="text-xs text-green-600">+12.5% จากเมื่อวาน</p>
            </div>
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600">฿</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ลูกค้าใหม่</p>
              <p className="text-2xl font-bold text-gray-900">24</p>
              <p className="text-xs text-blue-600">+8 จากสัปดาห์ที่แล้ว</p>
            </div>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600">👤</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">คำสั่งซื้อใหม่</p>
              <p className="text-2xl font-bold text-gray-900">18</p>
              <p className="text-xs text-orange-600">+2 จากเมื่อวาน</p>
            </div>
            <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-orange-600">📦</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ยอดขายเดือนนี้</p>
              <p className="text-2xl font-bold text-gray-900">฿2,847,320</p>
              <p className="text-xs text-purple-600">+18.2% จากเดือนที่แล้ว</p>
            </div>
            <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
              <span className="text-purple-600">📈</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">แผนการผลิตวันนี้</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <h4 className="font-medium">เสื้อโปโล สีน้ำเงิน</h4>
                <p className="text-sm text-gray-600">100 ตัว</p>
              </div>
              <span className="text-sm font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded">กำลังผลิต</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <h4 className="font-medium">กางเกงยีนส์ ขาสั้น</h4>
                <p className="text-sm text-gray-600">50 ตัว</p>
              </div>
              <span className="text-sm font-medium text-green-600 bg-green-100 px-2 py-1 rounded">เสร็จแล้ว</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div>
                <h4 className="font-medium">เสื้อยืด สีขาว</h4>
                <p className="text-sm text-gray-600">75 ตัว</p>
              </div>
              <span className="text-sm font-medium text-yellow-600 bg-yellow-100 px-2 py-1 rounded">รอคิว</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">กิจกรรมล่าสุด</h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">ใบเสนอราคาใหม่</p>
                <p className="text-xs text-gray-600">บริษัท ABC จำกัด</p>
                <p className="text-xs text-gray-500">5 นาทีที่แล้ว</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">ลูกค้าใหม่ลงทะเบียน</p>
                <p className="text-xs text-gray-600">คุณสมชาย ใจดี</p>
                <p className="text-xs text-gray-500">15 นาทีที่แล้ว</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <div>
                <p className="text-sm font-medium">การผลิตเสร็จสิ้น</p>
                <p className="text-xs text-gray-600">เสื้อโปโล 50 ตัว</p>
                <p className="text-xs text-gray-500">1 ชั่วโมงที่แล้ว</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">สรุปการเงิน</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">รายได้รวม</span>
              <span className="font-semibold text-green-600">฿2,847,320</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">ค่าใช้จ่าย</span>
              <span className="font-semibold text-red-600">฿1,523,180</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">กำไรสุทธิ</span>
              <span className="font-semibold text-blue-600">฿1,324,140</span>
            </div>
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">อัตรากำไร</span>
                <span className="font-bold text-lg text-green-600">46.5%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h2 className="text-lg font-semibold mb-4">การดำเนินการด่วน</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 text-center bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border">
              <div className="text-2xl mb-2">📊</div>
              <span className="text-sm font-medium">สร้างใบเสนอราคา</span>
            </button>
            <button className="p-4 text-center bg-green-50 hover:bg-green-100 rounded-lg transition-colors border">
              <div className="text-2xl mb-2">👥</div>
              <span className="text-sm font-medium">เพิ่มลูกค้าใหม่</span>
            </button>
            <button className="p-4 text-center bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors border">
              <div className="text-2xl mb-2">📈</div>
              <span className="text-sm font-medium">ดูรายงาน</span>
            </button>
            <button className="p-4 text-center bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors border">
              <div className="text-2xl mb-2">🏭</div>
              <span className="text-sm font-medium">จัดการการผลิต</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}