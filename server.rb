require 'webrick'
require 'json'
require 'fileutils'

PORT = 8000
DATA_FILE = File.expand_path('data.json', __dir__)

# 如果 data.json 不存在，初始化為空白結構
unless File.exist?(DATA_FILE)
  initial_data = {
    employees: [
      { id: 'emp-1', name: '陳小明', phone: '0912-345-678', role: '計時店員', color: '#E8DFF5' },
      { id: 'emp-2', name: '林美玲', phone: '0928-111-222', role: '資深收銀', color: '#D6EAD8' }
    ],
    shifts: [],
    active_shifts: {}
  }
  File.write(DATA_FILE, JSON.pretty_generate(initial_data))
end

# 建立 WEBrick 伺服器
server = WEBrick::HTTPServer.new(
  Port: PORT,
  DocumentRoot: __dir__,
  AccessLog: [], # 隱藏詳細請求日誌，保持終端乾淨
  Logger: WEBrick::Log.new(nil, WEBrick::BasicLog::WARN)
)

# API 1: 讀取所有資料
server.mount_proc '/api/data' do |req, res|
  res.status = 200
  res['Content-Type'] = 'application/json; charset=utf-8'
  res['Access-Control-Allow-Origin'] = '*'
  res.body = File.read(DATA_FILE)
end

# API 2: 寫入/儲存所有資料
server.mount_proc '/api/save' do |req, res|
  # 處理跨域 OPTIONS 請求
  if req.request_method == 'OPTIONS'
    res.status = 200
    res['Access-Control-Allow-Origin'] = '*'
    res['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS'
    res['Access-Control-Allow-Headers'] = 'Content-Type'
  elsif req.request_method == 'POST'
    begin
      data = JSON.parse(req.body)
      
      # 驗證必填鍵值，避免寫入不完整資料
      if data.key?('employees') && data.key?('shifts') && data.key?('active_shifts')
        File.write(DATA_FILE, JSON.pretty_generate(data))
        res.status = 200
        res['Content-Type'] = 'application/json'
        res['Access-Control-Allow-Origin'] = '*'
        res.body = { status: 'success' }.to_json
      else
        res.status = 400
        res['Access-Control-Allow-Origin'] = '*'
        res.body = 'Missing required keys'
      end
    rescue => e
      res.status = 500
      res['Access-Control-Allow-Origin'] = '*'
      res.body = "Error saving data: #{e.message}"
    end
  else
    res.status = 405
    res.body = 'Method Not Allowed'
  end
end

# 捕捉中斷訊號
trap('INT') { server.shutdown }

puts "========================================================"
puts "  員工打卡系統本地共享伺服器已成功啟動！"
puts "  本機存取網址: http://localhost:#{PORT}"
puts "========================================================"

server.start
