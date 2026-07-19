# KỊCH BẢN DIỄN THUYẾT CHI TIẾT — HỘI NGHỊ NGƯỜI DÙNG UniAI
*Khớp bản slide 28 trang (UniAI-hoi-nghi.pptx) · Tổng: 85–95 phút*

**Cách dùng kịch bản này:** phần chữ trong khung `>` là **lời thoại nguyên văn** — đọc được đúng như viết, hoặc nói theo ý sau khi đã thuộc. Phần *(nghiêng trong ngoặc)* là chỉ dẫn sân khấu: nhịp, ánh mắt, thao tác. Bốn "sợi chỉ" chạy xuyên suốt bài, đừng cắt: ① động từ **"tuyển"**, ② câu **"đêm đó không ai làm việc, nhưng công ty vẫn làm việc"**, ③ hình ảnh **cột trái / cột phải**, ④ **tờ phiếu trên bàn** — xuất hiện từ giữa bài và khép lại ở cuối.

**Chuẩn bị trước hội nghị:**
- [ ] In Phiếu tuyển cộng sự AI — đặt sẵn TRÊN BÀN từng người kèm bút (quan trọng: khán giả nhìn thấy nó từ đầu buổi, tò mò sẵn)
- [ ] In Tờ khái niệm bỏ túi 2 mặt A4
- [ ] Hẹn trước 1 phòng ban lên điền phiếu mẫu (họ chuẩn bị sẵn 1 quy trình lặp lại)
- [ ] Kiểm portal + thuộc kịch bản demo "app quản lý thư viện"; mở sẵn 2 tab: portal ẩn danh + workspace
- [ ] Đội nền tảng ngồi rải các bàn
- [ ] Presenter View bật — speaker notes đã nằm trong từng slide

---

# LỜI MỞ ĐẦU — TRƯỚC KHI BẤM SLIDE (2 phút)

*(Đứng trước màn hình tiêu đề. Nói mộc, chân thành — không cần kịch tính.)*

> Trước khi vào nội dung, tôi muốn kể ngắn gọn vì sao có buổi hôm nay.
>
> Hồi tháng 4, anh Trường gọi anh em vào họp và nêu một ý tưởng: đã đến lúc công ty mình phải có một nền tảng riêng, nơi AI không chỉ là công cụ trả lời — mà làm việc như một thành viên thực thụ: được giao việc, có trách nhiệm, có báo cáo.
>
> Từ cuộc họp đó đến hôm nay là mấy tháng vừa làm vừa học — có thứ đập đi làm lại, có đêm ngồi sửa đến muộn. Rồi có một buổi tối làm tôi tin là mình đi đúng hướng. Hôm đó gần nửa đêm, tôi tự vào website công ty, đóng vai một khách hàng, gõ vài dòng mô tả phần mềm cần làm — rồi tắt máy đi ngủ. Sáng hôm sau mở hộp thư: bản demo đã nằm sẵn ở đó, chạy được, chờ người duyệt. Người ra đề là tôi — mà tôi vẫn ngồi ngẩn ra một lúc. **Đêm đó không ai làm việc, nhưng công ty vẫn làm việc.**
>
> Nền tảng đó là UniAI. Chưa hoàn hảo — còn nhiều thứ phải sửa. Nhưng nó chạy thật, là của chúng ta, và từ hôm nay nó là của tất cả anh chị ngồi đây.

*(Bấm slide 1)*

---

# PHẦN MỞ (slide 1–2 · 4 phút)

## Slide 1 — Tiêu đề [1']

> Buổi hôm nay tôi không đến để giới thiệu một phần mềm. Tôi đến để làm một việc cụ thể hơn nhiều: **hướng dẫn anh chị tuyển nhân viên mới** — một kiểu nhân viên hơi đặc biệt.
>
> Và đây là lời hứa của tôi: sau buổi này, mỗi anh chị tự giao được việc cho một agent, và ra về với bản thiết kế cộng sự AI đầu tiên của chính mình — đã điền xong trên giấy. Không cần biết code. Không cần giỏi công nghệ. Chỉ cần biết rõ công việc của mình — mà việc đó thì anh chị giỏi hơn tôi.

*(Chỉ tay xuống tờ phiếu trên bàn — gieo sự tò mò đầu tiên)*

> Tờ giấy đang nằm trước mặt anh chị chính là bản thiết kế đó. Khoan điền vội — cuối buổi chúng ta sẽ điền cùng nhau. Còn bây giờ, mọi thứ bắt đầu từ một vòng lặp rất đơn giản.

## Slide 2 — Vòng lặp gốc [3']

*(Chỉ tay theo từng ô, đọc chậm, mỗi ô một nhịp)*

> Toàn bộ UniAI — và thật ra, toàn bộ buổi hôm nay — nằm gọn trong một vòng lặp năm bước.
>
> Một: **bạn tạo issue** — tức là ra một đề bài rõ ràng. Hai: **agent nhận việc** — như một đồng nghiệp nhận việc. Ba: nó làm, bằng **skill** — cuốn sổ tay nghiệp vụ của công ty. Bốn: nó **báo cáo** ngay trong issue, từng bước một. Và năm — bước quan trọng nhất: **bạn duyệt.**

*(Chỉ vào mũi tên hồi về phía dưới)*

> Anh chị để ý mũi tên quay ngược này. Kết quả chưa đạt? Phản hồi ngay trong issue — agent sửa tiếp, không làm lại từ đầu, không cãi, không tự ái. Còn đạt rồi? Xong việc.
>
> Và một điều tôi muốn nhấn ngay từ đầu: **mọi bước của vòng lặp này đều nhìn thấy được.** Không có hộp đen. Agent đang làm gì, đến đâu, vướng chỗ nào — mở issue ra là thấy hết.
>
> **Cả buổi hôm nay chỉ zoom vào từng ô của vòng lặp này. Anh chị nghe đến đâu thấy lạc — quay về sơ đồ này là tìm lại được đường.**

---

# PHẦN VÌ SAO (slide 3–5 · 8 phút)

## Slide 3 — Hôm nay ta làm việc thế nào, và UniAI đổi gì [3.5']

> Nhưng trước khi nói UniAI làm được gì, tôi muốn chúng ta thành thật với nhau về cách ta đang làm việc hôm nay.

*(Đi từng dòng bên trái — mỗi dòng dừng lại nhìn khán phòng, chờ cái gật đầu rồi mới sang dòng sau)*

> Giao việc qua chat, qua tin nhắn — rồi tin nhắn trôi. Ai đang làm gì, đến đâu — không ai nắm được. Có đúng không ạ?
>
> Báo cáo tuần, tổng hợp số liệu, soạn tài liệu theo mẫu — tuần nào cũng làm, và tuần nào cũng làm lại **từ đầu, bằng tay**. Có đúng không ạ?
>
> AI thì phòng nào cũng dùng rồi đấy — nhưng mỗi người một kiểu: người prompt hay, người prompt dở, kết quả không đều, và không lưu lại được gì cho người sau.
>
> Còn muốn biết tiến độ? Phải đi hỏi. Hỏi không được thì... họp.

*(Chuyển giọng, chỉ sang cột phải — nhanh và dứt khoát hơn)*

> UniAI đổi bốn chuyện đó thành bốn chuyện này: mọi việc là **issue** — có trạng thái, có người phụ trách, có lịch sử. Việc lặp lại — **agent và autopilot làm**, anh chị chỉ duyệt. Skill **chuẩn hoá** — mọi agent làm đúng chuẩn công ty, người mới cũng như người cũ. Và tiến độ? **Mở Inbox là thấy** — không cần chờ họp, chờ hỏi.
>
> **Anh chị nhớ giúp tôi cột bên phải. Cuối buổi tôi sẽ quay lại nó — vì từ ngày mai, chúng ta làm việc theo cột này.**

## Slide 4 — Không phải slide vẽ tương lai — đang chạy thật [3']

> Nghe đến đây, có thể có anh chị nghĩ: "vẽ thì đẹp." Tôi hiểu. Vì thế slide này tồn tại.
>
> Cái đêm tôi kể lúc mở đầu — chính là dây chuyền này chạy. Nó vận hành trọn vẹn từ đầu đến cuối: khách mô tả phần mềm cần làm, qua đội sale hoặc chat thẳng với agent trên portal, hoạt động 24/7. Rồi một "nhà máy" gồm sáu agent chuyền tay nhau: hiểu yêu cầu, thiết kế, dựng ứng dụng, đưa lên domain demo. Cuối cùng một email được soạn sẵn: link demo chạy thật, kèm tài khoản trải nghiệm. Hệ thống đã sẵn sàng — việc còn lại chỉ là mở cửa đón những đơn hàng thật đầu tiên, và đó chính là lý do có buổi hôm nay.

*(Chỉ vào dòng số — đọc chậm từng vế)*

> Trước đây, một bản demo như vậy tốn **vài ngày công lập trình viên**. Bây giờ — con người chỉ góp **khoảng ba mươi phút**, và toàn là ba mươi phút duyệt, không phải ba mươi phút làm. Mỗi demo. Bất kể ngày đêm.
>
> **Dây chuyền này có tên: UNICOM DEMO FACTORY. Nó không phải ý tưởng trên giấy — nó đã chạy trọn vẹn từ đầu đến cuối, và sẵn sàng đón đơn hàng thật đầu tiên. Nó vận hành thế nào, từng bánh răng một — chính là phần trọng tâm của buổi hôm nay.**

*(Móc câu đã gieo — KHÔNG giải thích gì thêm, chuyển luôn)*

## Slide 5 — Giao diện sản phẩm thực tế [1.5']

> Trước khi mổ xẻ nhà máy, cho anh chị nhìn mặt sản phẩm một chút.
>
> Bên trái là **portal** — cánh cửa khách hàng bước vào, nơi anh chị vừa thấy trong câu chuyện nửa đêm. Bên phải là **bảng issue trong workspace** — nơi anh chị sẽ làm việc mỗi ngày: mỗi tấm thẻ là một việc, kéo qua từng cột là thấy cả dòng chảy công việc của phòng.
>
> Hai màn hình này sẽ quay lại xuyên suốt buổi hôm nay. Nhìn quen mặt trước — lát nữa ta gặp lại chúng trong demo thật.

---

# PHẦN KHÁI NIỆM (slide 6–8 · 9 phút)

*(Cầu nối):*
> Giờ tôi cần trang bị cho anh chị đúng tám khái niệm — không phải để thi, mà vì lát nữa gặp nhà máy, anh chị sẽ thấy tám khái niệm này ghép lại thành máy móc thật. Tôi chia chúng làm hai nhóm: nơi làm việc, và bộ máy AI.

## Slide 6 — Nơi làm việc: ba lớp lồng nhau [3']

*(Chỉ từ ngoài vào trong)*

> Lớp ngoài cùng: **workspace** — văn phòng của phòng ban. Thành viên, dữ liệu, agent của phòng nào nằm trong phòng đó. Người ngoài workspace không nhìn vào được — chấm hết. Anh chị lo dữ liệu lộ ra ngoài? Đây là câu trả lời đầu tiên.
>
> Trong văn phòng có các **project** — mỗi project là một mục tiêu. Nhìn project là thấy tiến độ tổng, không phải cộng tay từng việc.
>
> Và hạt nhân nhỏ nhất: **issue** — một đầu việc. Có mô tả, có trạng thái, có người phụ trách. Anh chị nhìn trong hình: issue giao cho agent và issue giao cho đồng nghiệp nằm **cạnh nhau, cùng một bảng** — đó chính là điểm khác biệt của UniAI: người và AI chung một hệ thống quản lý công việc.
>
> Còn khung bên phải là **Inbox** — mọi cập nhật đổ về một chỗ. Tôi chỉ xin anh chị đổi đúng MỘT thói quen: **sáng mở Inbox trước, thay vì đi hỏi "việc kia tới đâu rồi."**
>
> Và câu quan trọng nhất slide này, tôi nói chậm: **mô tả issue — chính là đề bài bạn ra cho agent.** Ghi nhớ câu này, hai slide nữa nó thành tiền.

## Slide 7 — Bộ máy AI: agent ngồi ở đâu, chạy thế nào [3']

*(Đi theo sơ đồ, trái sang phải)*

> Giờ đến nhân vật chính: **agent**. Định nghĩa của tôi ngắn thôi: agent là đồng nghiệp AI — nhận issue, làm **đến xong**, tự báo cáo. Nó khác chatbot ở đúng một chữ: chatbot trả lời rồi quên; agent nhận việc và **chịu trách nhiệm** về việc đó, anh chị không cần ngồi theo dõi.
>
> Agent phải ngồi đâu đó để làm việc — chỗ ngồi đó gọi là **runtime**: một chiếc máy tính, của công ty hoặc của chính anh chị. Đèn xanh là nó đang sẵn sàng. Hết.
>
> Cạnh nó là **skill** — cuốn sổ tay nghiệp vụ. Agent tự tra sổ để làm đúng chuẩn công ty, lần thứ một trăm giống lần thứ nhất. Tôi đánh dấu trước: đây là khái niệm đắt giá nhất buổi hôm nay — cuối phần nhà máy tôi sẽ chứng minh vì sao.
>
> Và **autopilot** — chiếc đồng hồ báo thức: đến giờ, tự đánh thức agent dậy làm việc định kỳ, kết quả đổ về Inbox của anh chị.
>
> Tất cả truy cập qua trình duyệt web — không cần cài đặt gì.

## Slide 8 — Viết issue tốt = kết quả tốt [2.5']

> Tôi hứa quay lại câu "mô tả issue là đề bài" — và đây là kỹ năng duy nhất anh chị cần luyện.

*(Đọc TO bản bên trái, giọng đúng kiểu sếp bận):*

> "Làm cho anh cái báo cáo doanh số." *(chờ tiếng cười)* Quen không ạ? Với đề bài này, một nhân viên mới sẽ phải hỏi lại bốn câu — còn agent sẽ phải **đoán** bốn câu: số nào, mẫu nào, kỳ nào, gửi ai.

*(Đọc bản bên phải, giọng bình thường, rõ ràng):*

> Cũng việc đó, viết lại: "Tổng hợp doanh số tháng Sáu **từ file X**, theo **mẫu báo cáo tháng**, so sánh cùng kỳ, xong **trước 15 giờ thứ Sáu**. Kết quả: file cộng năm dòng tóm tắt." — Nguồn. Mẫu. Hạn. Tiêu chí xong. Bốn thứ đó là toàn bộ "kỹ năng prompt" mà anh chị cần.
>
> **Agent không đọc được suy nghĩ — nhưng nó đọc rất kỹ đề bài. Đề bài tốt, kết quả tốt.** Và quy tắc phụ: việc cần lưu vết thì tạo issue, hỏi nhanh thăm dò thì chat.

*(Nghỉ nhịp — uống ngụm nước. Đổi giọng, hào hứng):*

> Xong lý thuyết. Giờ đến phần tôi thích nhất buổi hôm nay. Tôi xin trân trọng giới thiệu... **đội sản xuất đầu tiên của UNICOM mà sáu trên bảy thành viên không phải con người.**

---

# PHẦN NHÀ MÁY (slide 9–22 · ~35 phút — PHẦN ĐINH)

## Slide 9 — Nhà máy demo + ảnh cả đội [3']

*(Bấm slide. IM LẶNG trọn 3 giây — để khán phòng tự ngắm ảnh đội. Đây là khoảnh khắc "trầm trồ" thứ nhất, đừng phá nó.)*

> Xin giới thiệu: đội UNICOM DEMO FACTORY. Ảnh tập thể hẳn hoi — sáu agent, và một con người đứng giữa.
>
> Dưới chân slide là băng chuyền mười trạm mà đội này đứng: khách bước vào từ trái — qua tư vấn, xác nhận, điều phối, thiết kế, thi công, giao hàng, viết thư — và bước ra ở phải với một bản demo trong hộp thư. Hai trạm màu đỏ là hai chốt chặn của con người.
>
> Vài ngày công dev — còn ba mươi phút duyệt. Và điều tôi muốn anh chị giữ trong đầu suốt phần này: **mỗi agent ở đây như một công nhân lành nghề — có não, có kiến thức, có cánh tay, và có bản mô tả công việc.** Câu đó không phải văn vẻ đâu — nó là kiến trúc thật, và ngay sau đây tôi chứng minh.

## Slide 10 — Giải phẫu một đội hình AI: 5 khối ⭐ [4']

*(Slide quan trọng nhất — đi CHẬM. Đây là "khung xương" người nghe sẽ mang về.)*

> Trước khi gặp từng thành viên, tôi cho anh chị nhìn bộ xương của cả đội. Bất kỳ đội hình AI nào vận hành được — không riêng nhà máy này — đều phải đủ **năm khối**.

*(Chỉ theo dòng chảy trái → phải)*

> Khối xanh dương — **Tiếp nhận**: cửa vào duy nhất của công việc. Hiểu yêu cầu, chuẩn hoá, xếp hàng đợi. Việc không qua cửa này — coi như không tồn tại.
>
> Khối cam — **Điều phối**: giữ nhịp, chia việc, đôn đốc. Nguyên tắc vàng: người điều phối **không làm chuyên môn**.
>
> Khối xanh lá — **Thực thi**: bốn người thợ, mỗi người một nghề hẹp, một cánh tay riêng.
>
> Khối đỏ — **Con người**: đứng ở những điểm không được phép uỷ quyền — cam kết với khách, chất lượng, phát ngôn ra ngoài.
>
> Và thanh tím chạy ngược dưới đáy — **Cải tiến**: điều gì lặp lại thì thăng cấp thành luật. Nhờ nó, đội tuần sau giỏi hơn tuần trước.

*(Dừng một nhịp, nhìn khán phòng)*

> Anh chị không cần nhớ tên sáu agent. Nhưng năm khối này thì nhớ giúp tôi — vì đây là cái khung để **chính anh chị về soi đội của mình**: thiếu Tiếp nhận — việc thất lạc. Thiếu Điều phối — ùn tắc. Thiếu Con người — rủi ro. Thiếu Cải tiến — giậm chân tại chỗ.
>
> Từ giờ, mỗi thành viên tôi giới thiệu đều đeo huy hiệu màu khối của mình ở góc thẻ.

## Slide 11 — Giải phẫu một agent: 4 bộ phận [3']

> Còn đây là giải phẫu MỘT thành viên. Tuyển một nhân viên, ta cần gì? — Bộ não. Kiến thức. Đôi tay. Bản mô tả công việc. Tuyển một agent: đúng y bốn thứ đó, không hơn.
>
> **Bộ não** — chọn model AI: việc khó dùng não mạnh. **Kiến thức** — gắn skill: gắn sổ tay nào giỏi nghề đó. **Bản mô tả công việc** — instructions: vai trò, phạm vi, khi nào phải dừng lại hỏi người.
>
> Riêng ô thứ tư tôi muốn dừng lâu hơn: **cánh tay** — tool và MCP. Agent chỉ làm được việc mà nó được cắm tay. Nghe kỹ nhé: một agent không được cắm tay gửi mail thì **về mặt vật lý không thể gửi mail** — không phải vì nó ngoan, mà vì nó không với tới. An toàn bằng **thiết kế**, không phải bằng dặn dò. Anh chị sẽ thấy nguyên tắc này lặp đi lặp lại ở cả sáu thành viên sắp gặp.
>
> Và để ý: bốn ô này — chính là bốn mục đầu của tờ phiếu trên bàn anh chị. Cuối buổi ta điền.

## Slide 12 — UNIKO, lễ tân + DEMO LIVE [2' + 5']

*(Giới thiệu như giới thiệu một người thật)*

> Thành viên đầu tiên — khối Tiếp nhận: **UNIKO, lễ tân của công ty.** Trực portal 24/7, không nghỉ trưa, không về quê ăn Tết.
>
> Nghề của UNIKO gói trong một dòng: tư vấn khách — chốt tóm tắt — tạo project — **hết nhiệm vụ**. Kiến thức: anh chị nhìn dòng này — "không gắn skill nội bộ nào, **cố ý**." Vì sao? Vì UNIKO nói chuyện với người lạ. Người tiếp khách không được biết bí mật trong xưởng. Cánh tay: đúng MỘT lệnh tạo project — muốn làm gì khác cũng không với tới.
>
> **Bài học đầu tiên: quyền tối thiểu — agent tiếp khách chỉ biết và làm đúng phần việc tiếp khách.**

*(DEMO LIVE — khoảnh khắc trầm trồ thứ hai. Thao tác chậm, đọc to từng bước):*

> Nói mãi không bằng nhìn. Ngay bây giờ, trên hệ thống thật.

1. Mở portal ở cửa sổ ẩn danh: "Đây là website công ty mình, ai cũng vào được."
2. Gõ: *"Tôi cần app quản lý thư viện: quản lý sách, mượn trả, và báo cáo."* — "Tôi đóng vai một khách vãng lai."
3. UNIKO hỏi lại → trả lời ngắn → UNIKO chốt khối **[TÓM TẮT DỰ ÁN]**: "Để ý — nó không hỏi lan man, nó chốt."
4. Bấm xác nhận, điền tên + email test.
5. Chuyển tab workspace: **project mới toanh vừa xuất hiện**, trạng thái "Đã lên kế hoạch." — *(quay lại khán phòng, nói chậm):*

> **Vừa rồi không phải video quay sẵn. Là hệ thống thật, đang chạy, ngay lúc này.** Và anh chị để ý: project đang nằm ở "Đã lên kế hoạch" — nhà máy CHƯA chạy. Nó đợi một cú điện thoại của con người xác nhận với khách. Máy không được tự tiêu tiền của công ty — đó là thiết kế.

## Slide 13 — MAX, quản đốc [2']

> Sau cú điện thoại xác nhận, việc rơi vào tay người này: **MAX — quản đốc dây chuyền.**
>
> Điều đầu tiên phải nói về MAX là điều nó **không** làm: không thiết kế, không build, không gửi mail. MAX chỉ tạo issue, đóng gói ngữ cảnh, giao đúng người, gom báo cáo, giữ nhịp. Nghe quen không ạ? — đó chính xác là một người quản lý giỏi.
>
> Nghịch lý thú vị: MAX là agent có **bộ não mạnh nhất** dây chuyền — vì điều phối mới là việc khó nhất. Và kiến thức của MAX là bản "shared-contract" — bộ luật nhà máy, trong đó có định nghĩa đắt nhất: **"xong" nghĩa là có bằng chứng** — không phải một câu tuyên bố suông.
>
> **Bài học: tách người điều phối khỏi người thi công — y như quản lý con người.**

## Slide 14 — demo-ops, đồng hồ báo thức của MAX [2']

> Khoan — nếu MAX là quản đốc, thì ai đánh thức MAX? *(chỉ dải định vị)* Anh chị nhìn dải băng chuyền dưới thẻ: ô sáng vẫn là MAX. Vì demo-ops **không phải một agent** — nó là cái đồng hồ báo thức: cứ mười phút, đánh thức MAX dậy tuần tra một vòng — có project mới xác nhận chưa, có ai làm xong mà quên bàn giao không.
>
> Và mỗi vòng tuần tra, nó ghi lại một nhịp — chúng tôi gọi là **heartbeat**, nhịp tim. Sáng nào tôi cũng chỉ cần liếc một dòng đó là biết: đêm qua, cả nhà máy vẫn thở. *(nhịp ngắn)* Nhớ câu chuyện mở đầu chứ ạ — "đêm đó không ai làm việc, nhưng công ty vẫn làm việc"? Chính là nhờ chiếc đồng hồ này.
>
> **Bài học: autopilot không làm chuyên môn — nó giữ nhịp, và làm lưới an toàn.**

## Slide 15 — LEVI, kiến trúc sư [2']

> Vào khối Thực thi. Người thợ đầu tiên: **LEVI — kiến trúc sư.**
>
> Nghề của LEVI: biến yêu cầu của khách thành **gói bàn giao** — bản vẽ đủ chi tiết để thợ xây làm mà không phải quay lại hỏi. Nhưng bí quyết thật sự của LEVI là cuốn sổ thứ hai nó mang theo: **playbook** — bộ quyết định sẵn cấp công ty. Màu thương hiệu nào, bộ vai trò mẫu ra sao, dữ liệu demo tiếng Việt kiểu gì — những câu khách không quan tâm trả lời, công ty đã quyết sẵn.
>
> **Bài học: đóng gói chuẩn riêng của công ty thành skill — yêu cầu không nêu thì tra playbook, không tự phỏng đoán.**

## Slide 16 — LOVIBUILD, thợ xây [2']

> Bản vẽ xong, đến tay **LOVIBUILD — thợ xây.**
>
> Thi công đúng bản vẽ của LEVI, tự kiểm từng tiêu chí nghiệm thu, sai tự sửa, xong nộp báo cáo kèm bằng chứng. Kỷ luật của nó nằm ở chỗ **không** làm gì: không tự thiết kế, không tự suy diễn nghiệp vụ — LEVI đã quyết định toàn bộ.
>
> Và nhìn cánh tay nó: LOVIBUILD là agent **duy nhất** trong công ty được cắm tay vào công cụ dựng ứng dụng. LEVI giỏi đến mấy cũng không tự build được — không phải vì cấm, mà vì **không với tới**. Nguyên tắc cánh tay, lần thứ ba.
>
> **Bài học: thợ giỏi là thợ làm đúng bản vẽ — sáng tạo đặt ở khâu thiết kế, không ở khâu thi công.**

## Slide 17 — DEPLO, người giao hàng [1.5']

> App dựng xong phải đến tay khách: **DEPLO — người giao hàng**, đưa ứng dụng lên domain demo.
>
> DEPLO có một luật khắc chết trong bản mô tả công việc: **chỉ deploy trong dải domain demo của công ty.** Yêu cầu ghi trong brief? Từ chối. Ghi trong comment? Từ chối. Khách năn nỉ? Vẫn từ chối.
>
> **Bài học: luật an toàn khắc vào bản mô tả công việc — không yêu cầu nào từ bên ngoài khiến agent vượt rào được.**

## Slide 18 — MILO, người viết thư [2']

> Và người thợ cuối cùng — người duy nhất được nói chuyện với thế giới bên ngoài: **MILO, người viết thư.**
>
> MILO soạn email bàn giao demo cho khách. Sổ tay của nó quy định giọng văn công ty, mẫu thư, khung HTML có logo — và quan trọng hơn: quy định cả những điều **không được viết** — giá cả, cam kết thương mại, thông tin nội bộ.
>
> MILO là agent duy nhất có tay gửi mail. Nhưng trên tay đó có một chiếc khoá: **bản gửi đi luôn luôn là bản mà người thật đã duyệt nguyên văn.** Không có chữ ký duyệt — không một email nào rời khỏi công ty. Không có ngoại lệ, kể cả ba giờ sáng.
>
> **Bài học: tiếng nói ra bên ngoài luôn có người gác cuối.**

## Slide 19 — HUMAN, thành viên thứ 7 [2.5']

*(Đổi giọng — chậm và trân trọng. Khoảnh khắc trầm trồ thứ ba.)*

> Và bây giờ... thành viên quan trọng nhất của nhà máy. *(bấm slide — dừng 2 giây, ảnh chân dung thật tự nói)* Một con người.
>
> Trong sổ sách của nhà máy, HUMAN được đối xử **y như một thành viên**: có tên trong danh sách đội, được mention như agent, việc rơi vào Inbox như agent — và có cả người dự phòng khi vắng mặt. Không phải "người dùng đứng ngoài hệ thống" — mà là thành viên **trong** hệ thống.
>
> Kiến thức của HUMAN — hiểu khách hàng, hiểu công ty — là thứ duy nhất ở đây chưa đóng gói được thành skill. Và cánh tay của HUMAN là những quyền mà cả sáu agent cộng lại cũng không có: xác nhận với khách. Nghiệm thu sản phẩm. Và chữ ký cuối trên mỗi email.
>
> **Bài học lớn nhất của cả nhà máy: thiết kế hệ AI tốt không phải là bỏ con người ra — mà là đặt con người vào vị trí quyền lực nhất.**

## Slide 20 — Một ngày của HUMAN [2']

> Vậy một ngày của thành viên quyền lực nhất trông thế nào? Ba chạm.
>
> **Sáng:** rà hàng đợi project chờ xác nhận — nhấc máy gọi khách, chốt yêu cầu, rồi mới cho dây chuyền chạy. **Trong ngày:** nhận mention qua Inbox — vào nghiệm thu demo trước khi bàn giao. **Trước khi gửi:** duyệt email, nguyên văn — không duyệt, thư không đi.
>
> Cộng lại: **khoảng ba mươi phút cho một demo** — và để ý: cả ba mươi phút đều là việc cần óc phán đoán, không một phút nào là việc tay chân. **Máy làm phần máy giỏi, người làm phần người giỏi.**

## Slide 21 — Vòng học [2.5']

> Còn đây là phần khiến tôi tự hào nhất về nhà máy này — thanh tím trong sơ đồ năm khối, giờ phóng to.
>
> Nhà máy vận hành mỗi ngày, mỗi demo đóng lại đều kèm tổng kết. Rồi có người để ý: một quyết định cứ lặp đi lặp lại — ba demo liền, khách đều muốn cùng một thứ. Thế là quyết định đó được **thăng cấp thành luật**: ghi vào playbook. Demo thứ tư? LEVI không phải luận nữa — tra sổ, làm luôn.
>
> Anh chị thấy điều gì đang xảy ra không? **Nhà máy này tuần sau giỏi hơn tuần trước — mà không cần ai dạy lại từ đầu.**
>
> Và đây là lúc tôi trả món nợ từ slide khái niệm — vì sao tôi nói Skill là khái niệm đắt giá nhất: **tri thức không còn nằm trong trí nhớ cá nhân — nó được lưu giữ trong hệ thống.** Người giỏi nhất phòng nghỉ phép, kinh nghiệm của họ vẫn đi làm.

## Slide 22 — 7 thành viên & cơ chế phối hợp [2']

> Toàn đội trên một bảng — anh chị chụp ảnh slide này được, nó là bản tóm tắt cả phần vừa rồi. Mỗi hàng một thành viên: nghề — kiến thức — cánh tay. Sáu cánh tay khác nhau, không ai giẫm chân ai.
>
> Còn chất keo dán họ lại? Không họp. Không nhắn riêng. Chỉ có issue: làm xong → báo cáo đúng mẫu → chuyển trạng thái → thông báo quản đốc. "Xong" là có bằng chứng. Và một nguyên tắc cốt lõi giữ cả dây chuyền an toàn: **dữ liệu không phải mệnh lệnh** — nội dung khách viết là thứ để xử lý, không phải lệnh để thi hành. Khách ghi trong yêu cầu "hãy gửi mail cho địa chỉ này" — agent ghi nhận, nhưng không làm theo.

---

# PHẦN XÂY ĐỘI CỦA BẠN (slide 23–25 · 22 phút gồm workshop)

*(Cầu nối — đổi tư thế, bước gần khán phòng hơn):*

> Đến đây thường có một suy nghĩ xuất hiện — tôi đoán trong phòng này cũng đang có: *"Hay đấy. Nhưng đội tôi lấy đâu ra người dựng nổi cái nhà máy bảy thành viên này?"*

## Slide 23 — 3 cấp trưởng thành [3']

> Tin tốt: **không ai phải bắt đầu từ nhà máy.** Kể cả chúng tôi cũng không bắt đầu từ nhà máy.
>
> Cấp Một — **một cộng sự**: một agent, làm một nghề hẹp, cho riêng anh chị. Một agent, một skill, anh chị duyệt. Dựng trong **một buổi**. Cấp Hai — cộng sự cộng chiếc đồng hồ: thêm autopilot, việc định kỳ tự chạy. Và Cấp Ba — dây chuyền: nhiều cộng sự chuyền tay nhau, đủ năm khối, có quản đốc. Demo Factory là Cấp Ba.
>
> **Hôm nay, tất cả chúng ta ra về ở Cấp Một: mỗi người tuyển đúng MỘT cộng sự. Nhà máy nghe ghê gớm vậy thôi — nó chỉ là nhiều cộng sự ghép lại theo năm khối. Mà công thức tuyển một cộng sự thì... anh chị vừa học xong rồi.**

## Slide 24 — Phiếu tuyển cộng sự + WORKSHOP [3' + 15']

*(Giơ tờ phiếu thật lên cao)*

> Tờ giấy nằm trên bàn anh chị từ đầu buổi — giờ là lúc của nó. **Phiếu tuyển cộng sự AI.** Năm ô. Bốn ô đầu — chính là bốn bộ phận của agent anh chị đã học: nghề, kiến thức, cánh tay, và trạm gác của con người. Ô thứ năm: đề bài đầu tiên anh chị sẽ giao.
>
> Quy trình sau buổi này: anh chị điền — nộp — và đây là cam kết công khai của đội nền tảng: **bốn mươi tám giờ sau, phiếu của anh chị thành một agent chạy thật.**

**Điền mẫu live (5'):** *(mời phòng ban đã hẹn lên sân khấu, hỏi to từng mục, điền trước khán phòng)*
- "Việc gì phòng mình làm ít nhất mỗi tuần một lần?" → chốt NGHỀ, một câu
- "Làm việc đó theo mẫu nào, quy trình nào?" → KIẾN THỨC
- "Phải đụng vào hệ thống nào không? Không đụng thì bỏ trống — càng ít tay càng an toàn" → CÁNH TAY
- "Bước nào anh/chị nhất định phải tự duyệt?" → TRẠM GÁC
- "Và việc đầu tiên giao cho nó tuần này?" → ĐỀ BÀI ĐẦU TIÊN
> Xong. Chưa đầy năm phút — phòng [tên] vừa tuyển xong nhân viên AI đầu tiên của họ. *(vỗ tay)*

**Workshop toàn hội trường (10–15'):**
> Giờ đến lượt tất cả. Mười lăm phút. Đội nền tảng đang ở các bàn. Một mẹo duy nhất: **việc càng hẹp càng dễ thành công** — đừng tuyển cộng sự "làm mọi thứ", hãy tuyển cộng sự làm MỘT thứ thật gọn.
*(Đi giữa các bàn. Nhắc lại mẹo ở phút thứ 7. Thu phiếu cuối buổi — công bố):*
> Chồng phiếu này chính là lộ trình AI của toàn công ty trong quý tới — do chính anh chị viết, không phải do phòng công nghệ áp xuống.

## Slide 25 — 3 việc & lời hẹn [2']

> Ba việc, bắt đầu từ ngày mai. Một: đăng nhập workspace phòng mình. Hai: nộp phiếu — bốn mươi tám giờ sau nhận agent. Ba: tự tay tạo và giao issue số một cho cộng sự của mình — đề bài tốt nhé: nguồn, mẫu, hạn, tiêu chí xong.
>
> **Và lời hẹn tôi nói từ đầu buổi: từ ngày mai, chúng ta làm việc theo cột bên phải — mọi việc là issue, việc lặp lại giao agent, mở Inbox là thấy tất cả.**

---

# PHẦN KẾT — TIẾNG NÓI LÃNH ĐẠO (slide 26–27 · 8 phút + Q&A)

## Slide 26 — Kỳ vọng đến cuối năm 2026 [4']

*(Đổi vai rõ rệt: dừng lại, đứng thẳng, chậm hẳn xuống. Đây không còn là bài hướng dẫn.)*

> Phần cuối này, cho phép tôi nói không phải với tư cách người trình bày — mà với tư cách một thành viên ban lãnh đạo.
>
> Đây là kỳ vọng của chúng tôi đến cuối năm. *(đọc từng con số, mỗi con số một nhịp, không vội)* **Một trăm phần trăm** phòng ban đạt Cấp Hai — nghĩa là phòng nào cũng có cộng sự AI và autopilot vận hành thật. **Ít nhất năm** quy trình lặp lại được tự động hoá ở mỗi phòng — quy tắc đơn giản: việc tuần nào cũng làm thì agent đảm nhận. **Hơn một trăm** skill trong thư viện chung — tri thức của công ty được đóng gói lại, không nằm rải trong trí nhớ từng người nữa. Và **năm dây chuyền** như Demo Factory vận hành.
>
> Con số nghe tham vọng. Đúng — chúng tôi cố tình đặt nó tham vọng. Nhưng đây là cam kết **hai chiều**: công ty cam kết nền tảng, hạ tầng, và đội hỗ trợ bốn mươi tám giờ. Đổi lại, mỗi phòng ban cam kết những con số này. Không ai phải đi một mình.
>
> Còn thước đo thành công thật sự, với tôi chỉ có một — không nằm trong bốn ô số kia: **đến cuối năm, "giao cho agent" trở thành phản xạ tự nhiên như "gửi email." Khi đó UniAI không còn là một dự án — nó là cách UNICOM làm việc.**
>
> Tháng 4, một ý tưởng của anh Trường mở ra con đường này. Tháng 12, chúng ta cùng nhìn lại xem mình đã đi xa đến đâu — và câu trả lời bắt đầu từ tờ phiếu anh chị đang cầm trên tay.

## Slide 27 — Q&A [10–15']

> Cảm ơn anh chị. Giờ là phần của mọi người — câu hỏi nào cũng hợp lệ, kể cả câu "tôi vẫn chưa tin."

*(Slide 28 — 5 câu hỏi nhân rộng — để sẵn: mở ra khi có người hỏi "phòng tôi muốn có dây chuyền riêng thì làm thế nào?")*

---

# PHỤ LỤC — TRẢ LỜI SẴN CÂU HỎI KHÓ

| Câu hỏi | Trả lời gợi ý |
|---|---|
| "Agent làm sai thì sao?" | Mọi việc nằm trong issue, người duyệt trước khi kết quả đi tiếp. Sai → phản hồi trong issue, agent sửa. Sai lặp lại → siết instruction/skill — đó chính là khối Cải tiến đang vận hành |
| "AI thay người à?" | Nhìn nhà máy: máy làm phần lặp lại, người giữ toàn bộ quyền phán quyết. HUMAN là thành viên quyền lực nhất — 30 phút phán đoán của người thay cho vài ngày việc tay chân, không phải thay cho con người |
| "Dữ liệu công ty có lộ ra ngoài không?" | Nền tảng tự chủ, chạy trên hạ tầng công ty, workspace tách biệt từng phòng. Agent chỉ có cánh tay được cấp — không cấp thì về mặt vật lý không đụng được |
| "Tôi không biết viết prompt" | Không cần. Viết ĐỀ BÀI như giao việc cho đồng nghiệp mới: nguồn — mẫu — hạn — tiêu chí xong. Prompt chuyên sâu nằm trong Skill, đội nền tảng lo |
| "Muốn quy trình mới thành skill?" | Mục 2 của phiếu chính là bước đầu — mô tả quy trình, đội nền tảng đóng gói trong tuần |
| "Bao giờ phòng tôi có dây chuyền như Demo Factory?" | Mở slide 28: trả lời đủ 5 câu hỏi của 5 khối là dựng được — đội nền tảng đồng hành với 5 phòng đăng ký đầu tiên |
| "Chi phí thế nào?" | Nền tảng đã đầu tư xong, chạy trên hạ tầng công ty. Chi phí biên mỗi agent rất thấp so với giờ công tiết kiệm — số liệu chi tiết BLĐ công bố theo quý |
