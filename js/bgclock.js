// Backgammon Clock and Score board App 用 JavaScript

  //広域変数
  var score = [0, 0, 0]; //スコアを初期設定。引数を1,2として使うため、配列要素は3つ用意
  var matchlength = 5;
  var crawford = 0; //0=before cf, 1=cf, 2=post cf
  var cfplayer = 0;
  var allotedtime = 600; //初期設定10分
  var timer = [0, allotedtime, allotedtime]; //引数を1,2として使うため、配列要素は3つ用意
  var delaytime = 12;
  var delay = delaytime;
  var turn = 0; //0=どちらでもない、1 or 2=どちらかがプレイ中
  var pauseflg = true; //pause状態で起動する
  var clock; //タイマ用変数
  var clockspd = 1000; //msec どこまでの精度で時計を計測するか
                       //1000の約数でないと時計の進みがいびつになり、使いにくい
                       //200msecだと残時間管理が精密になるがブラウザのCPU負荷が上がる
  var soundflg = true;
  var vibrationflg = true;

//イベントハンドラの定義
$(function() {

  //設定画面の[APPLY] ボタンがクリックされたとき
  $('#applybtn').on('click', function(e) {
    set_initial_vars();
    $('#settingwindow').slideUp("normal");
  });

  //設定画面の[CANCEL] ボタンがクリックされたとき
  $('#cancelbtn').on('click', function(e) {
    $('#settingwindow').slideUp("normal"); //設定画面を消す
  });

  //メイン画面の[SETTING] ボタンがクリックされたとき
  $('#settingbtn').on('click', function(e) {
    topleft = winposition( $('#settingwindow') );
    $('#settingwindow').css(topleft).slideDown("normal"); //画面表示
  });

  //メイン画面の[PAUSE] ボタンがクリックされたとき
  $('#pausebtn').on('click', function(e) {
    if (turn == 0) { return; } //どちらの手番でもない場合は何もしない
    if (pauseflg) { //PAUSE -> PLAY
      pause_out();
      $('#timer1,#timer2').removeClass("teban_pause").addClass("noteban");
      $('#timer'+turn).addClass("teban").removeClass("noteban");
      startTimer(turn); //現在の持ち時間からクロック再開
    } else { //PLAY -> PAUSE
      pause_in();
      stopTimer();
    }
    sound("pause"); vibration("pause");
  });

  //クロックの場所がクリック(タップ)されたとき
  $('#timer1,#delay1,#timer2,#delay2').on('touchstart mousedown', function(e) {
    event.preventDefault(); // touchstart以降のイベントを発生させない
    idname = $(this).attr("id");
    tappos = Number(idname.substr(5,1));
    tap_timerarea(tappos);
  });

  //スコア操作のボタンがクリックされたとき
  $('#score1up,#score1dn,#score2up,#score2dn').on('click', function(e) {
    idname = $(this).attr("id");
    modify_score(idname);
  });

}); //close to $(function() {

//スコア操作ボタンによるスコア設定
function modify_score(idname) {
  player = Number(idname.substr(5,1));
  updn   = idname.substr(6,1);

  delta = updn=="u" ? +1 : updn=="d" ? -1 : 0; //押されたボタンを判断し、増減を決める
  score[player] += delta;
  if (score[player] < 0) { score[player] = 0; }

  //Crawfordかどうかを判断
  if (matchlength - score[player] == 1 && crawford == 0) {
    crawford = 1; cfplayer = player; cfstr = "Crawford";
  } else if (crawford == 2 || (crawford == 1 && cfplayer != player)) {
    crawford = 2; cfplayer = 0;      cfstr = "Post Crawford";
  } else {
    crawford = 0; cfplayer = 0;      cfstr = "";
  }

  //画面に反映
  $('#score'+player).text(score[player]);
  $('#crawford').text(cfstr);
}

//ポップアップ画面で設定した内容を反映
function set_initial_vars() {
  $('#player1').text( $('#playername1').val() );
  $('#player2').text( $('#playername2').val() );
  score = [0, 0, 0];
  $('#score1').text(score[1]);
  $('#score2').text(score[2]);
  matchlength = $('#matchlength').val();
  if (matchlength == 0) { //unlimited
    $('#gamemode').text("Unlimited game");
  } else {
    $('#gamemode').text("Match game to "+ matchlength);
  }
  crawford = 0;
  $('#crawford').text("");
  delaytime = Number($('#delaytime').val());
  $('#delay1,#delay2').text(("00"+delaytime).substr(-2));
  allotedtime = Number($('#allotedtimemin').val()) * 60;
  timer = [0, allotedtime, allotedtime];
  disp_timer(1, timer[1]);
  disp_timer(2, timer[2]);
  turn = 0; //手番をリセット
  appmode = $('[name=appmode]:checked').val();
  switch (appmode) {
  case "clock":
    $('#timer1,#timer2,#delay1,#delay2,#pauseinfo,#pausebtn').show();
    $('#timer1,#timer2').removeClass("lose");
    $('#player1,#player2').show();
    $('#scorecontainer').hide();
    break;
  case "score":
    $('#scorecontainer').show();
    $('#scorecontainer').addClass("scorecontainer_scoreonly").removeClass("scorecontainer");
    $('#score1,#score2').addClass("score_scoreonly");
    $('#timer1,#timer2,#delay1,#delay2,#pauseinfo,#pausebtn').hide();
    $('#player1,#player2').show();
    break;
  default: //full
    $('#timer1,#timer2,#delay1,#delay2,#pauseinfo,#pausebtn').show();
    $('#timer1,#timer2').removeClass("lose");
    $('#scorecontainer').removeClass("scorecontainer_scoreonly").addClass("scorecontainer");
    $('#score1,#score2').removeClass("score_scoreonly");
    $('#scorecontainer').show();
    $('#player1,#player2').show();
    break;
  }
  soundflg = $('[name=sound]').prop("checked");
  vibrationflg = $('[name=vibration]').prop("checked");
}

//PLAY -> PAUSE
function pause_in() {
  pauseflg = true;
  $('#pauseinfo').show();
  $('#settingbtn,#score1up,#score1dn,#score2up,#score2dn').prop('disabled', false); //ボタンクリックを有効化
  $('#timer1,#timer2').removeClass("teban noteban").addClass("teban_pause"); //クロックを無手番に
}

//PAUSE -> PLAY
function pause_out() {
  pauseflg = false;
  $('#pauseinfo').hide();
  $('#settingbtn,#score1up,#score1dn,#score2up,#score2dn').prop('disabled', true); //ボタンクリックを無効化
}

//クロックを表示
function disp_timer(turn, time) {
  min = Math.floor(time / 60);
  sec = Math.floor(time % 60);
  timestr = ("00" + min).substr(-2) + ":" + ("00" + sec).substr(-2);
  $('#timer'+turn).text(timestr);
}

//クロック表示場所をクリック(タップ)したときの処理
function tap_timerarea(tappos) {
  //クロック稼働中で相手側(グレーアウト側)をクリックしたときは何もしない
  //＝相手の手番、またはポーズのときは以下の処理を実行
  if (turn != tappos && pauseflg == false) { return; }

  if (pauseflg) { //ポーズ状態のときはポーズを解除
    pause_out();
  }
  turn = ( tappos==1 ? 2 : tappos==2 ? 1 : 0 ); //手番切替え
  sound("tap"); vibration("tap");

  stopTimer(); //自分方のクロックを止める

  delay = delaytime; //保障時間を設定
  $('#delay'+turn).text(("00"+delay).substr(-2));
      $('#player1').text("turn"+turn+"tappos"+tappos);
  //クロックの稼働/停止を切替え
  switch (turn) {
    case 1:
      //左側のクロックを稼働
      $('#timer1').addClass("teban").removeClass("noteban teban_pause");
      $('#delay1').show();
      //右側を停止
      $('#timer2').addClass("noteban").removeClass("teban teban_pause");
      $('#delay2').hide();
      break;
    case 2:
      //右側のクロックを稼働
      $('#timer2').addClass("teban").removeClass("noteban teban_pause");
      $('#delay2').show();
      //左側を停止
      $('#timer1').addClass("noteban").removeClass("teban teban_pause");
      $('#delay1').hide();
      break;
    default:

      break;
  }

  startTimer(turn); //相手方のクロックをスタートさせる
}

function startTimer(turn) {
  clock = setInterval(function(){countdown(turn);}, clockspd);
}

function stopTimer() {
  clearInterval(clock);
}

//クロックをカウントダウン
function countdown(turn) {
  if (delay > 0) {
    //保障時間内
    delay -= clockspd / 1000;
    $('#delay'+turn).text(("00"+Math.floor(delay)).substr(-2));
  } else {
    //保障時間切れ後
    $('#delay'+turn).hide();
    timer[turn] -= clockspd / 1000;
    if (timer[turn] < 0) { timeup_lose(turn); return; } //切れ負け処理
    disp_timer(turn, timer[turn]);
  }
}

//切れ負け処理
function timeup_lose(turn) {
  $('#timer'+turn).text("LOSE").addClass("lose");
  stopTimer();
  pause_in(); //ポーズ状態に遷移
  sound("buzzer"); vibration("buzzer");
}

//音を鳴らす
function sound(type) {
  if (soundflg) {
    document.getElementById(type).play(); //音の種類は引数で指定
  }
}

//バイブレーション
function vibration(type) {
  if (vibrationflg) {
    switch (type) {
    case "tap":
      navigator.vibrate( 50 );  break;
    case "pause":
      navigator.vibrate( [50, 50, 100] );  break;
    case "buzzer":
      navigator.vibrate( 1000 ); break;
    }
  }
}

//画面中央に表示するための左上座標を計算
function winposition(winobj) {
  wx = $(document).scrollLeft() + ($(window).width() - winobj.outerWidth()) / 2;
  if (wx < 0) { wx = 0; }
  wy = $(document).scrollTop() + ($(window).height() - winobj.outerHeight()) / 2;
  if (wy < 0) { wy = 0; }
  return {top:wy, left:wx};
}
