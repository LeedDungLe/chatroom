var express = require("express");
var  app = express();
app.use(express.static("public"));
app.set("view engine","ejs");
app.set("views","./views");

var mysql = require('mysql');
var pool = mysql.createPool({
	connectionLimit : 10,
    host    : 'localhost',
    user    : 'root',
    password: '',
    database: 'chatroom'
});


var conn = mysql.createConnection({
    host    : 'localhost',
    user    : 'root',
    password: '',
    database: 'chatroom',
    multipleStatements: true
});

var server = require("http").Server(app);
var io = require("socket.io")(server);
//Listen on port 3000
server.listen(3000);

var clients =[];

io.on("connection", function(socket){
	console.log("Co nguoi ket noi - id: "+ socket.id);

	socket.on("client_login",function(data){	
		pool.getConnection(function (err, conn){			
		if (err) throw err.stack;
		var sql = "SELECT * FROM user where username = \""+data.username+"\"";
			conn.query(sql, function (err, results, fields) {			    
				conn.release();
				if (err) throw err.stack;			        
				if(results.length == 0){			        	
				    socket.emit("sai_username");
				}
				if (results.length == 1) {	
				    if(results[0].password == data.password){				    	

				    	var clientInfo = new Object();
      				    clientInfo.name = results[0].username;
        			    clientInfo.id = socket.id;
           				clients.push(clientInfo);

           				socket.isWait = false;
				    	socket.isAdmin = results[0].isAdmin;
				    	socket.username = results[0].username;
				    	socket.user_id = results[0].user_id;
				        socket.emit("server_accept_login");
					 }
					if (results[0].password != data.password){
					    socket.emit("sai_passwprd");
					}
				}			     
			});
		});	
	});

	socket.on("open_room",function(data){
		pool.getConnection(function (err, conn){			
		if (err) throw err.stack;
		var sql = "SELECT * FROM room where room_id = \""+data.id+"\"";
			conn.query(sql, function (err, results, fields) {			    
				conn.release();
				if (err) throw err.stack;	
				if(results[0].user_id == socket.user_id) {
					// neu user la admin thi cho vo luon
									var usersInRoom=[];
									 socket.join(data.name);
									socket.room = data.name;
									socket.room_id=data.id;
									 io.in(data.name).clients((err,clis) => {
										    for (i=0; i< clients.length; i++){										
												for (j=0;j<clis.length;j++){
													if (clients[i].id == clis[j]){
														clients[i].inRoom = data.name;
														usersInRoom.push(clients[i])
													}
												}
											}
										io.sockets.in(data.name).emit("clients_in_room", usersInRoom); 										
									 });									 
									// Gui doan chat trong db

									pool.getConnection(function (err, conn){			
										if (err) throw err.stack;
										var sql = "SELECT user.username, message.content FROM message,user WHERE user.user_id=message.user_id and message.room_id =\""+ data.id + "\"";
										conn.query(sql, function (err, result, fields) {			    
												conn.release();
												if (err) throw err.stack;
												var tmpData = [];
												for (i=0;i<result.length;i++){
													var tmp = new Object();
      				    							tmp.name = result[i].username;
        			   								tmp.content = result[i].content;
        			   								tmpData.push(tmp);
												}
												socket.emit("server_send_old_message",tmpData);
												
										});
									});
									// gui request list cho admin
									pool.getConnection(function (err, conn){			
										if (err) throw err.stack;
										var sql = "SELECT user.user_id, user.username, request.password FROM request,user WHERE user.user_id=request.user_id and request.room_id =\""+ data.id + "\"";
										conn.query(sql, function (err, result, fields) {			    
												conn.release();
												if (err) throw err.stack;
												var tmpData = [];
												for (i=0;i<result.length;i++){
													var tmp = new Object();
      				    							tmp.name = result[i].username;
        			   								tmp.password = result[i].password;
        			   								tmp.id =result[i].user_id;
        			   								tmpData.push(tmp);
												}
												socket.emit("server_send_request_list",tmpData);
												
										});
									});
									// Gui member list cho admin
									pool.getConnection(function (err, conn){			
										if (err) throw err.stack;
										var sql = "SELECT memberof.user_id,user.username FROM memberof,user WHERE memberof.user_id = user.user_id AND memberof.room_id =\""+ data.id + "\"";
										conn.query(sql, function (err, result, fields) {			    
												conn.release();
												if (err) throw err.stack;
												var tmpData = [];
												for (i=0;i<result.length;i++){
													var tmp = new Object();
      				    							tmp.name = result[i].username;        			   								
        			   								tmp.id =result[i].user_id;
        			   								tmpData.push(tmp);
												}
												socket.emit("server_send_member_list",tmpData);
												
										});
									});



					socket.emit("send_admin_room",{
						room:data.name,usr: socket.username						
					})
					socket.emit("send_state_of_room",results[0].isPublic);
					socket.emit("close_of_open_room",results[0].isOpen);

				} else if(results[0].user_id != socket.user_id){
					// Xet truong hop user khong phai la admin
					if(results[0].isOpen == false){
						// Xet truong hop room dang dong
						socket.emit("room_is_closing");
					} else if(results[0].isOpen == true){
						// Xet truong hop room dang mo
						if(results[0].isPublic == false){
							// xet truong hop room yeu cau mat khau dang nhap
							pool.getConnection(function (err, conn){			
								if (err) throw err.stack;
								var sql = "SELECT * FROM memberof where room_id = \""+data.id+"\" AND user_id = \""+socket.user_id+"\"";
									conn.query(sql, function (err, result, fields) {			    
										conn.release();
										if (err) throw err.stack;
										if(result.length == 0){
											//xet truong hop user khong phai thanh vien san cua room
											socket.emit("require_password_to_join",data.id);
										}else if(result.length == 1){
											// Neu la thanh vien thi cho vo, cap nhap ds user trong room luon
											 	var usersInRoom=[];
												 socket.join(data.name);
												 socket.room = data.name;
												 socket.room_id=data.id;
												 io.in(data.name).clients((err,clis) => {
										   		 for (i=0; i< clients.length; i++){										
													for (j=0;j<clis.length;j++){												
													if (clients[i].id == clis[j]){
														clients[i].inRoom = data.name;
														usersInRoom.push(clients[i])
													}
												}
											}
											io.sockets.in(data.name).emit("clients_in_room", usersInRoom); 										   
									 });
												 //db send old msg
									pool.getConnection(function (err, conn){			
										if (err) throw err.stack;
										var sql = "SELECT user.username, message.content FROM message,user WHERE user.user_id=message.user_id and message.room_id =\""+ data.id + "\"";
										conn.query(sql, function (err, result, fields) {			    
											conn.release();
											if (err) throw err.stack;
											var tmpData = [];
											for (i=0;i<result.length;i++){
												var tmp = new Object();
				      				    		tmp.name = result[i].username;
				        			   			tmp.content = result[i].content;
				        			   			tmpData.push(tmp);
											}
											socket.emit("server_send_old_message",tmpData);																
										});
									});

											socket.emit("send_room",{
											 	room:data.name,usr: socket.username
											});
										}		
								    })		
							})	

						}else if(results[0].isPublic == true){
							//Xet truong hop room cong khai, ai cung vo dc
								 	var usersInRoom=[];
									 socket.join(data.name);
									 socket.room = data.name;
									 socket.room_id=data.id;
									 io.in(data.name).clients((err,clis) => {
										    for (i=0; i< clients.length; i++){										
												for (j=0;j<clis.length;j++){														
													if (clients[i].id == clis[j]){
														clients[i].inRoom = data.name;
														usersInRoom.push(clients[i])
													}
												}
											}
										io.sockets.in(data.name).emit("clients_in_room", usersInRoom); 										   
									 });
									 //db send old msg
									 pool.getConnection(function (err, conn){			
										if (err) throw err.stack;
										var sql = "SELECT user.username, message.content FROM message,user WHERE user.user_id=message.user_id and message.room_id =\""+ data.id + "\"";
										conn.query(sql, function (err, result, fields) {			    
											conn.release();
											if (err) throw err.stack;
											var tmpData = [];
											for (i=0;i<result.length;i++){
													var tmp = new Object();
				      				    			tmp.name = result[i].username;
				        			   				tmp.content = result[i].content;
				        			   				tmpData.push(tmp);
											}
											socket.emit("server_send_old_message",tmpData);
																
										});
									});
							socket.emit("send_room",{
								 room:data.name,usr: socket.username
							});
						}
					}	
				}						     
			});
		});	
	});

	socket.on("roi_khoi_room",function(){
		var usersInRoom=[];
		//socket.leave(data.name);
		var curRoom = socket.room;
			
			socket.leave(curRoom);
			io.in(curRoom).clients((err,clis) => {
			   for (i=0; i< clients.length; i++){										
						for (j=0;j<clis.length;j++){						
							if (clients[i].id == clis[j]){
								usersInRoom.push(clients[i]);
							}
						}
				}
				io.sockets.in(curRoom).emit("clients_in_room", usersInRoom);
			});		
	});


	

	socket.on("iam-typing",function(){
		io.sockets.in(socket.room).emit("someone-is-typing");
	});

	socket.on("im-stop-typing",function(){
		io.sockets.in(socket.room).emit("someone-stop-typing");
	});

	socket.on("client_send_pass_join_request",function(data){
		pool.getConnection(function (err, conn){
			if (err) throw err.stack;
			var sql1 ="SELECT * FROM request WHERE user_id ="+socket.user_id+" AND room_id = "+ data.id;
			conn.query(sql1, function (err, results, fields) {			    
				if (err) throw err.stack;
				if(results.length == 0){
					var sql = "INSERT INTO request( user_id, room_id, password) VALUES (?,?,?) ";
					var prepare = [socket.user_id, data.id,data.pw];
			    	sql = conn.format(sql,prepare);
					conn.query(sql, function (err, result, fields) {			    
						
							if (err) throw err.stack;
					});
				} else if (results.length == 1){
					var sql = "UPDATE request SET password = \""+data.pw+"\" WHERE user_id ="+socket.user_id+" AND room_id = "+ data.id;
					conn.query(sql, function (err, result, fields) {			    
						
							if (err) throw err.stack;
					});
				}
			});
			conn.release();
			
		});			
	});

	// Xu ly tin nhan duoc gui den
	socket.on("user_send_msg",function(data){

		console.log("co nguoi gui msg: "+data);
		pool.getConnection(function (err, conn){			
			if (err) throw err.stack;
			var sql = "INSERT INTO message( content, user_id, room_id) VALUES (?,?,?) ";
			var prepare = [data, socket.user_id,socket.room_id];
    		sql = conn.format(sql,prepare);
			conn.query(sql, function (err, results, fields) {			    
				conn.release();
				if (err) throw err.stack;
			});
		});	
		io.sockets.in(socket.room).emit("user_send_msg_to_all",{
			name: socket.username,
			content: data
		});
		
	});
	// xu ly tin nhan private duoc gui den
	socket.on("user_send_private_msg",function(data){
		console.log("co nguoi gui private msg: "+data);
		io.to(socket.partner_id).emit("user_send_back_private_msg",{
			name: socket.username,
			content: data
		});	
		socket.emit("user_send_back_private_msg",{
			name: socket.username,
			content: data
		});	
	});


	socket.on("user_logout",function(){
		var index;
		for(i=0;i<clients.length; i++){
			if(clients[i].id == socket.id){
				index = clients[i];
			}
		}
		clients.splice(clients.indexOf(index),1);
		console.log("Someone just logout, remain client: ");
		console.log(clients);
	})


	socket.on("set_room_private",function(){
		pool.getConnection(function (err, conn){			
			if (err) throw err.stack;
			var sql = "UPDATE room SET isPublic = false WHERE room.room_id = " +socket.room_id;
			conn.query(sql, function (err, results, fields) {			    
				conn.release();
				if (err) throw err.stack;
			});
		});
	});

	socket.on("set_room_public",function(){
		pool.getConnection(function (err, conn){			
			if (err) throw err.stack;
			var sql = "UPDATE room SET isPublic = true WHERE room.room_id = " +socket.room_id;
			conn.query(sql, function (err, results, fields) {			    
				conn.release();
				if (err) throw err.stack;
			});
		});
	});

	socket.on("set_close_room",function(){
		pool.getConnection(function (err, conn){			
			if (err) throw err.stack;
			var sql = "UPDATE room SET isOpen = false WHERE room_id =" +socket.room_id;
			conn.query(sql, function (err, results, fields) {			    
				conn.release();
				if (err) throw err.stack;
			});
		});
	});

	socket.on("set_open_room",function(){
		pool.getConnection(function (err, conn){			
			if (err) throw err.stack;
			var sql = "UPDATE room SET isOpen = true WHERE room_id =" +socket.room_id;
			conn.query(sql, function (err, results, fields) {			    
				conn.release();
				if (err) throw err.stack;
			});
		});
	});

	socket.on("admin_accept_user",function(data){
		pool.getConnection(function (err, conn){			
			if (err) throw err.stack;
			var sql = "INSERT INTO memberof( user_id, room_id) VALUES (?,?)" ;
			var prepare = [data,socket.room_id];
    		sql = conn.format(sql,prepare);
			conn.query(sql, function (err, results, fields) {			    
			if (err) throw err.stack;
			});

			var sql1 = "DELETE FROM request WHERE user_id ="+ data + " and room_id ="+ socket.room_id ;
			conn.query(sql1, function (err, results, fields) {			    
				if (err) throw err.stack;
			});

			var sql2 = "SELECT user.user_id, user.username, request.password FROM request,user WHERE user.user_id=request.user_id and request.room_id =\""+ socket.room_id + "\"";
			conn.query(sql2, function (err, result, fields) {	   
				if (err) throw err.stack;
				conn.release();
				var tmpData = [];
				for (i=0;i<result.length;i++){
					var tmp = new Object();
      				tmp.name = result[i].username;
        			tmp.password = result[i].password;
        			tmp.id =result[i].user_id;
        			tmpData.push(tmp);
				}
				socket.emit("server_send_request_list",tmpData);			
			});

		});
	});


	
	socket.on("admin_delete_user",function(data){
		pool.getConnection(function (err, conn){			
			if (err) throw err.stack;
			console.log("room_id: "+ socket.room_id)
			var sql = "DELETE FROM memberof WHERE user_id =" +data+ " AND room_id ="+ socket.room_id ;
			conn.query(sql, function (err, results, fields) {			    
			if (err) throw err.stack;
			});

			var sql = "SELECT memberof.user_id,user.username FROM memberof,user WHERE memberof.user_id = user.user_id AND memberof.room_id ="+ socket.room_id ;
				conn.query(sql, function (err, result, fields) {			    
					conn.release();
					if (err) throw err.stack;
					var tmpData = [];
					for (i=0;i<result.length;i++){
						var tmp = new Object();
      				    tmp.name = result[i].username;        			   								
        			   	tmp.id =result[i].user_id;
        			   	tmpData.push(tmp);
					}
					socket.emit("server_send_member_list",tmpData);
												
				});
		});
	});



	socket.on("user_send_private_chat",function(data){
		console.log("--private chat rqust--");
		if(socket.isWait == false){
			if(data == socket.id){
				socket.emit("choose_another_person_to_chat");
			}
			else if(data != socket.id){
				socket.isWait = true;
				socket.partner_id = data;
				console.log(socket.username+" send rqust to "+ data)
				io.to(data).emit("other_send_private_chat_request",{
					name: socket.username,
					id: socket.id
				});
			}
		}
	});

	socket.on("accept_private_chat",function(data){
		socket.partner_id = data.id;
		io.to(data.id).emit("accept_msg",{
			id: socket.id, name: socket.username
		});
		socket.isWait = true;
	});

	socket.on("decline_private_request",function(data){
		io.to(data).emit("user_send_decline");
	});

	socket.on("return_requset_state",function(){
		socket.isWait = false;
		
	})

	socket.on("end_private_chat",function(){
		io.to(socket.partner_id).emit("user_send_stop_chat");
		socket.emit("me_send_stop_chat");
	});
});


app.get("/", function(req,res){
	res.render("views");
});
