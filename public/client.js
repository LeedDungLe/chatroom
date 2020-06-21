var socket = io("http://localhost:3000");


// xac thuc dang nhap
socket.on("sai_username",function(){
	alert("username doesn't exit !");
});

socket.on("sai_passwprd",function(){
	alert("wrong password !");
});

socket.on("server_accept_login",function(){	
	$("#loginGUI").hide(500);
	$("#roomListGUI").show(500);
});

// hien thi giao dien phong  chat nguoi dung binh thuong
socket.on("send_room",function(data){
	$("#roomListGUI").hide(500);
	$("#roomGUI").show(1000);	
	$("#name_room").html("welcome to "+ data.room);
	$("#currentUser").html(data.usr)
	
});
// hien thi giao dien phong chat cua admin
socket.on("send_admin_room",function(data){
	$("#roomListGUI").hide(500);
	$("#AdminRoomGUI").show(1000);	
	$("#admin_name_room").html("welcome to "+ data.room);
	$("#currentAdmin").html(data.usr)
	
});


// hien thi danh sach cac user hien trong room
socket.on("clients_in_room",function(data){
	$(".boxContent").html("");
	data.forEach(function(i){
		$(".boxContent").append("<div style='margin-top: 5px; margin-bottom: 5px; class='user'>"+i.name+"<input type ='button' style='float:right' class ='privateChat' id ='"+i.id+"' value='chat' /> </div>");
	});
});


// hien thi tin nhan cu 
socket.on("server_send_old_message",function(data){
	$(".listMessage").html("");
	data.forEach(function(i){
		$(".listMessage").append("<div class='msg'>"+i.name + " : "+i.content+"</div>");
	})
});

// user nhan duoc tin nhan
socket.on("user_send_msg_to_all",function(data){
	$(".listMessage").append("<div class='msg'>"+data.name + " : "+data.content+"</div>");
});
// user nhan duoc tin nhan private
socket.on("user_send_back_private_msg",function(data){
	$(".pListMessage").append("<div class='Pmsg'>"+data.name + " : "+data.content+"</div>");
});

// thong bao co nguoi dang go tin nhan
socket.on("someone-is-typing", function(){
	$(".thongbao").html("someone is typing");
});
// thong bao nguoi dang go tin nhan da ngung go
socket.on("someone-stop-typing", function(){
	$(".thongbao").html("");
});
// thong bao room dang dong nen khong vao dc
socket.on("room_is_closing",function(){
	alert("This room is unavailable now");
});
// hien thi thong bao yeu cau pass de vao duoc room
socket.on("require_password_to_join",function(data){
	  var psswrd = prompt("Please enter the password:");
	  if (psswrd != null && psswrd != "") {
	   socket.emit("client_send_pass_join_request",{pw: psswrd, id: data});
	  } 
});
// Hien thi danh sach yeu cau tham gia room kem theo pass de xet duyet
socket.on("server_send_request_list",function(data){
	$("#boxRequest").html("");
	data.forEach(function(i){
		$("#boxRequest").append("<div style='margin-top: 5px; margin-bottom: 5px;' >"+i.name+" : "+i.password+"<input type ='button' style='float:right' class ='btnAccept' id ='"+i.id+"' value='accept' /> </div>")
	});
});
// hien thi danh sach thanh vien trong room
socket.on("server_send_member_list",function(data){
	$("#boxMember").html("");
	data.forEach(function(i){
		$("#boxMember").append("<div style='margin-top: 5px; margin-bottom: 5px;' >"+i.name+"<input type ='button' style='float:right' class ='btnDelete' id ='"+i.id+"' value='delete' /> </div>")
	});
});

// gui trang thai private hay public cho cai checkbox
socket.on("send_state_of_room",function(data){
	$("#myCheck").prop('checked', !data);
});

socket.on("close_of_open_room",function(data){
	$("#closeCheck").prop('checked', !data);
});
// hien thi thong bao khong the chat voi chinh minh
socket.on("choose_another_person_to_chat",function(){
	alert("Cannot private chat to yourself");
});
// thong bao co nguoi gui yeu cau chat private voi minh
socket.on("other_send_private_chat_request",function(data){
	console.log("get rqst msg from : "+ data.name);
	var r = confirm(data.name +" want to chat to you");
	if (r == true) {
    socket.emit("accept_private_chat",data);
    $(".otherUser").html("");
    $(".otherUser").append("<label>"+data.name+"</label>");
    $(".middleRight").show(1000);

  } else {
     socket.emit("decline_private_request",data.id);
       }
});
// thong bao minh bi tu choi chat rieng
socket.on("user_send_decline",function(){
	alert("your chat request has been decline !");
	socket.emit("return_requset_state");
})
// thong bao minh duoc chap nhan chat rieng
socket.on("accept_msg",function(data){
	alert(data.name+ " has accepted your request !")
	$(".pListMessage").html("");
	$(".otherUser").html("");
	$(".otherUser").append("<label>"+data.name+"</label>");
	$(".middleRight").show(1000);

})
// thong bao nguoi minh dang chat rieng da roi di
socket.on("user_send_stop_chat",function(){
	alert("your partner has stopped chat with you");
	socket.emit("return_requset_state");
	$(".pListMessage").html("");
	$(".otherUser").html("");
	$(".middleRight").hide(1000);
});

// xu ly sau khi ngung chat
socket.on("me_send_stop_chat",function(){
	$(".pListMessage").html("");
	$(".otherUser").html("");
});



$(document).ready(function(){
	$("#loginGUI").show();
	$("#roomListGUI").hide();
	$("#roomGUI").hide();
	$("#AdminRoomGUI").hide();
	$(".middleRight").hide();


	$("#myCheck").change(function() {
	    if($("#myCheck").is(':checked')==true){
	    	alert("Set room to private ");
	    	socket.emit("set_room_private");
	    } else if($("#myCheck").is(':checked')==false){
	    	alert("Set room to public ");
	    	socket.emit("set_room_public");
	    }
	});

	$("#closeCheck").change(function() {
	    if($("#closeCheck").is(':checked')==true){
	    	alert("Close this room ");
	    	socket.emit("set_close_room");
	    } else if($("#closeCheck").is(':checked')==false){
	    	alert("Open this room ");
	    	socket.emit("set_open_room");
	    }
	});

	$(".txtMessage").focusin(function(){
		socket.emit("iam-typing");
	});

	$(".txtMessage").focusout(function(){
		socket.emit("im-stop-typing");
	});

	$("#btnLogin").click(function(){
		socket.emit("client_login",
			{username: $("#txtUsername").val(),
			 password: $("#txtPassword").val()}
		);
	});

	$(".room").click(function(){		
			socket.emit("open_room",{id:this.id, name: this.name});
	});

	$("#btnLogout").click(function(){
		$("#loginGUI").show(500);
		$("#roomListGUI").hide(500);
	});

	// admin nhan nut gui tin nhan
	$("#btnAdminSend").click(function(){
		if($("#txtAdminMsg").val() != "" && $("#txtAdminMsg").val() != null ){
			socket.emit("user_send_msg",$("#txtAdminMsg").val());
		}
		
		$("#txtAdminMsg").val('');
	});
	// admin nhan gui tin nhan cua private chat
	$("#btnPAdminSend").click(function(){
		if($("#pTxtAdminMsg").val() != "" && $("#pTxtAdminMsg").val() != null ){
			socket.emit("user_send_private_msg",$("#pTxtAdminMsg").val());
		}
		
		$("#pTxtAdminMsg").val('');
	});

	// normal user an nut gui tin nhan
	$("#btnSend").click(function(){
		if($("#txtMsg").val() != "" && $("#txtMsg").val() != null){
			socket.emit("user_send_msg",$("#txtMsg").val());
		}		
		$("#txtMsg").val('');
	});

	// normal nhan gui tin nhan cuar private chat

	$("#btnPSend").click(function(){
		if($("#pTxtMsg").val() != "" && $("#pTxtMsg").val() != null){
			socket.emit("user_send_private_msg",$("#pTxtMsg").val());
		}		
		$("#pTxtMsg").val('');
	});

	$(".btnReturn").click(function(){
		$("#roomListGUI").show(500);
		$("#roomGUI").hide(500);
		$("#AdminRoomGUI").hide(500);
		socket.emit("roi_khoi_room");

	});

	$("#btnLogout").click(function(){
		socket.emit("user_logout");
	});
	
	$(document).on("click", ".btnAccept", function() {
		socket.emit("admin_accept_user",this.id);
	});
	
	$(document).on("click", ".btnDelete", function() {
		socket.emit("admin_delete_user",this.id);
	});

	$(document).on("click", ".privateChat", function() {
		socket.emit("user_send_private_chat",this.id);
	});

	$(document).on("click", ".stopPrivateChat", function() {
		socket.emit("end_private_chat");
		socket.emit("return_requset_state");
		$(".middleRight").hide(1000);
	});

});

