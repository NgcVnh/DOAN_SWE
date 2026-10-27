# BrewLite — Mobile-First Coffee & Beverage Ordering Platform
UserStory 1: Quản lý giỏ hàng

US-01- Quản lý giỏ hàng
  Là một khách hàng, tôi muốn thêm, thay đổi số lượng và xóa đồ uống trong giỏ hàng, để điều chỉnh đơn hàng trước khi thanh toán
    Tiêu chí chấp nhận (Acceptance Criteria):
      Khi khách hàng chọn một sản phẩm và thêm vào giỏ, sản phẩm xuất hiện trong giỏ hàng
      Khi khách hàng thay đổi số lượng, số lượng mới và thành tiền được cập nhật
      Khi xóa sản phẩm, sản phẩm đó không còn trong giỏ hàng
      Tổng tiền được tính lại khi khách thêm, sửa, xóa sản phẩm
      Khi giỏ hàng trống, tổng tiền phải bằng không và giao diện thể hiện giỏ trống 


UserStory 2: Chi tiết sản phẩm


US-02 - Chi tiết sản phẩm
  Là một khách hàng, tôi muốn xem chi tiết sản phẩm và lựa chọn kích thước, topping để tùy chỉnh đồ uống theo sở thích 
    Tiêu chí chấp nhận (Acceptance Criteria):
      Khi khách hàng chọn một sản phẩm trên trang menu, hệ thống hiển thị thông tin chi tiết của sản phẩm bao gồm hình ảnh, tên, giá
      Hệ thống cho phép khách hàng chọn size S, M, L
      Hệ thống cho phép khách hàng chọn topping có sẵn
      Khi khách hàng thay đổi size hay topping, giá phải được cập nhật theo các tùy chọn đã chọn 
      Khi khách hàng nhấn nút “Thêm giỏ vào hàng” sản phẩm với tùy chọn được thêm vào giỏ


UserStory 3: Đăng ký và đăng nhập tài khoản


US-03-Đăng ký và đăng nhập tài khoản
  Là một khách hàng, tôi muốn đăng ký đăng nhập tài khoản Brew Lite để sử dụng các chức năng đặt hàng 
    Tiêu chí chấp nhận (Acceptance Criteria):
      Khi khách hàng cung cấp thông tin đăng ký hợp lệ thì tạo tài khoản mới
      Nếu thông tin đăng ký không hợp lệ hay email đã tồn tại, hệ thống thông báo lỗi phù hợp
      Khi khách nhập đúng email và mật khẩu thì hệ thống đăng nhập vào trang chủ
      Mật khẩu được băm khi đưa vào cơ sở dữ liệu
      Khi người dùng chưa đăng nhập truy cập chức năng đặt hàng thì hệ thống yêu cầu đăng nhập


UserStory 4: Thanh toán không tiền mặt

US-04-Thanh toán không tiền mặt
  Là một khách hàng, tôi muốn thanh toán đơn hàng bằng ví điện tử/ thẻ để tôi không cần mang tiền mặt
    Tiêu chí chấp nhận (Acceptance Criteria):
      Khi giỏ hàng có ít nhất một sản phẩm, nút “Thanh toán” hiển thị tổng tiền
      Chọn phương thức (Ví/ Thẻ) rồi xác nhận hệ thống tạo đơn hàng ở trạng thái PAID
      Nếu thanh toán lỗi, đơn ở trạng thái PAYMENT FAILED và giỏ được giữ nguyên
      Sau khi thanh toán thành công, hiển thị mã đơn hàng và màn hình xác nhận


UserStory 5: Tạo đơn hàng


US-05-Tạo đơn hàng
  Là một khách hàng đã đăng nhập, tôi muốn tạo đơn hàng từ các sản phẩm trong giỏ hàng, để đặt mua đồ uống trên BrewLite. 
    Tiêu chí chấp nhận (Acceptance Criteria):
      Khi khách hàng gửi yêu cầu đặt hàng với giỏ hàng hợp lệ, hệ thống kiểm tra dữ liệu đầu vào trước khi tạo đơn. 
      Nếu giỏ hàng có ít nhất một sản phẩm hợp lệ và đáp ứng điều kiện đặt hàng, hệ thống tạo đơn hàng và lưu vào cơ sở dữ liệu. 
      Đơn hàng mới được tạo có trạng thái ban đầu là PENDING 
      Sau khi tạo đơn thành công, hệ thống trả về mã đơn hàng cho khách hàng. 
      Nếu dữ liệu đặt hàng không hợp lệ, hệ thống từ chối yêu cầu và trả về thông báo lỗi phù hợp. 
      Chỉ người dùng đã đăng nhập mới được tạo đơn hàng. 


UserStory 6: Xác nhận lịch sử đơn hàng

US-06-Xác nhận lịch sử đơn hàng
  Là một khách hàng tôi muốn xem lại thông tin xác nhận và lịch sử đơn hàng để tôi kiểm tra mã đơn và trạng thái đơn hàng đó
    Tiêu chí chấp nhận (Acceptance Criteria):
      Sau khi đặt hàng thành công, hệ thống hiển thị mã đơn hàng và trạng thái hiện tại của đơn. 
      Sau khi thanh toán thành công, hệ thống hiển thị trạng thái PAID trên màn hình 
      Khi khách hàng truy cập lịch sử đơn hàng, hệ thống hiển thị danh sách các đơn hàng thuộc tài khoản đang đăng nhập. 
      Mỗi đơn hàng trong lịch sử hiển thị tối thiểu mã đơn hàng, tổng tiền, thời gian tạo và trạng thái đơn. 
      ếu khách hàng chưa có đơn hàng nào, hệ thống hiển thị thông báo lịch sử đơn hàng trống. 
      Khách hàng không được xem lịch sử đơn hàng của tài khoản khác. 

UserStory 7: Xem menu sản phẩm

US-07-Xem menu sản phẩm
  Là một khách hàng tôi muốn xem danh sách đồ uống trên Brew Lite cùng với hình ảnh, tên và giá tiền để lựa chọn đồ uống trước khi đặt hàng
    Tiêu chí chấp nhận (Acceptance Criteria):
      Khi khách hàng truy cập trang menu, hệ thống hiển thị danh sách đồ uống 
      Mỗi đồ uống hiển thị đầy đủ hình ảnh, tên và giá tiền 
      Hệ thống lấy danh sách đồ uống từ API backend
      Nếu không có đồ uống thì hiển thị thông báo danh sách trống

