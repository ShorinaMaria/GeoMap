var map = {};

$(function(){

    new Player();
    $('#showhide').click(function(){
        window.scrollTo(0, 0);
        $('#control').toggleClass('hidden');
    });

});

$.get('map_canvas.json', function (Mapdata) {
    if(!Mapdata){
        alert('Map canvas loading failed!');
        return;
    }
    map = initMap({
        higlightableTag: 'zone',
        labelHideZoom: 17,
        minZoom: 17,
        maxZoom: 28,
        zoom: 17,
        fitBounds: true,
        trackControl: true
    });
    loadMapCanvas(Mapdata);

});

var Player = function(){
    var this_ = this;
    this.timer = null;  //таймер для отрисовки точек
    this.timerUpdateTime = null;    //таймер обновления времени в интерфейсе - нужен, если временной отрезок между парой точек больше секунды
    this.points = [];
    this.frame = 0;   //индекс текущей точки
    this.isPlaying = false;

    var $app_id = $('#app-id');
    this.$speed = $('#speed');

    var $play = $('#play');
    var $stop = $('#stop');
    var $slider = $('#slider');
    var $forward = $('#forward');
    var $back = $('#back');
    var $timeStart = $('#time-start');
    var $timeEnd = $('#time-end');

    //исходдные данные по умолчанию
    this.app_id = 3;
    this.speed = 1;
    this.timeStart = (new Date(2015, 12-1, 29, 17, 32)).getTime();
    this.timeEnd = (new Date(2015, 12-1, 29, 17, 52)).getTime();

    //для загрузки в datetimepicker
    var timeStartStr = '29.12.2015 17:32';
    var timeEndStr = '29.12.2015 17:52';

    //кнопки плейера
    var controls = ['play','stop','back','forward'];
    for(var i=0; i<controls.length; i++){
        $('#'+controls[i]).click(function(){
            var control = $(this).attr('id');
            this_[control] && this_[control]();
        });
    }


    //------------------------------------------------------------------------------------------------->
    $slider.slider({
        disabled: true,
        range: "min",
        value: this_.timeStart,
        min: this_.timeStart,
        max: this_.timeEnd - 1,
        slide: function( event, ui ) {
            var pointObj = this_.getPointFromTime(ui.value);
            this_.pause();
            this_.isPlaying = true;
            $play.addClass('active pause');
            this_.drawPoint(pointObj.frame, pointObj.delayAfter);
        }
    });
    $timeStart.datetimepicker({
        theme: 'dark',
        value: timeStartStr,
        format: 'd.m.Y H:i',
        onChangeDateTime: function(dp,$input){
            this_.timeStart = dp.getTime();
        }
    });
    $timeEnd.datetimepicker({
        theme: 'dark',
        value: timeEndStr,
        format: 'd.m.Y H:i',
        onChangeDateTime:function(dp,$input){
            this_.timeEnd = dp.getTime();
        }
    });
    $app_id.val(this_.app_id);
    $app_id.change(function(){
        this_.app_id = parseInt($(this).val()) || 0;
    });
    this_.$speed.val(this_.speed);
    this_.$speed.change(function(){
        this_.speed = parseInt($(this).val()) || 1;
    });

    //---------------------------------------------------------------------------------------------->
    //форматирует миллисекунды в дату и время (и отрисовывает, если нужно)
    this.timestampToDateTime = function(timestamp, draw){
        var d = new Date(parseInt(timestamp));
        var hours = d.getHours();
        var minutes = "0" + d.getMinutes();
        var seconds = "0" + d.getSeconds();
        //var mills = "0" + d.getMilliseconds();

        var date = d.getDate() + '.' + (d.getMonth()+1) + '.' + d.getFullYear();
        var time = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2); // + ':' + mills;

        if(draw){
            $('#date').html(date);
            $('#time').html(time);
        }
        return {date:date, time:time};
    }

    this_.timestampToDateTime(this_.timeStart, true);

    //находит точку, которая должна отрисовываться в заданное время (в миллисекундах)
    this.getPointFromTime = function(mills){
        for(var i=0; i<this_.points.length-1; i++){
            var pointPrev = this_.points[i];
            var pointNext = this_.points[i+1];
            if(mills >= +pointPrev.timestamp && mills < +pointNext.timestamp){
                return{ frame: i, delayAfter: Math.round((+pointNext.timestamp - mills)/this_.speed) };
            }
        }
        console.log('Error - no points found!');
    }


    //отрисовка точки
    this.drawPoint = function(frame, delayAfter){
        var point = this_.points[frame];
        console.log('___________________ point done_____________'+frame + ' at ' + (this_.timestampToDateTime(point.timestamp)).time);
        onTerminalPositionChange(point.x, point.y, point.level);
        this_.timestampToDateTime(point.timestamp, true);

        this_.frame = frame + 1;
        this_.realPlay(this_.frame, delayAfter);
    }

    this.play = function(frame){
        if($play.hasClass('pause')){
            this_.pause();
            return;
        }
        this_.isPlaying = true;

        //проверяем, играет ли сначала, либо после паузы
        if(!this_.timer){
            socket.emit('load-track',{
                appId: this_.app_id,
                startTimeStamp: this_.timeStart,
                endTimeStamp: this_.timeEnd}
            );
            $slider.slider('option','value',this_.timeStart);
            $slider.slider('option','disabled',false);
        }else{
            console.log('----------- RESUME -----------');
            this_.realPlay(this_.frame);
        }

        //todo: create prepare function
        $stop.removeClass('disabled');
        $play.addClass('active pause');
        $forward.removeClass('disabled');
        $back.removeClass('disabled');
    }

    this.realPlay = function(frame, interval){
        frame = frame || 0; //индекс кадра, который начнёт проигрываться через таймаут (текущий кадр)
        if(frame >= this_.points.length) {
            this_.stop();
            return;
        }

        this_.points[frame>0 ? frame-1 : this_.points.length-1].timePassed = 0;    //предыдущая точка уже отыграла, удаляем информацию

        if(!interval){
            if(frame){
                /** реальное время начала предыдущего кадра
                 * (с учётом того, что на нём могла быть пауза и в следующий раз его нужно играть уже не от самого его начала)
                 */
                var realStartTime = this_.points[frame].timePassed || this_.points[frame-1].timestamp;
                interval = Math.round((this_.points[frame].timestamp - realStartTime)/this_.speed);
            }else{
                interval = (this_.points[0].timestamp - this_.timeStart)/this_.speed;
            }
        }
        console.log('frame = ' + frame + ', i = ' + interval);

        //время начала предыдущего кадра
        var time = this_.points[frame].timePassed || (frame ? +this_.points[frame-1].timestamp : this_.timeStart);
        $slider.slider('option','value',time);

        //если временное расстояние между точками больше секунды, то запускаем таймер обновления времени в интерфейсе
        clearInterval(this_.timerUpdateTime);
        if(interval>1000){
            this_.startTimeUpdater(time);
        }

        //отрисовываем текущую точку через таймаут
        this_.timer = setTimeout(this_.drawPoint, interval, frame);
    }

    this.startTimeUpdater = function(time){
        if(this_.isPlaying) {
            var timeNew = time + 1000;
            this_.timerUpdateTime = setTimeout(function(){
                console.log('_______________________________________________update time! '+this_.timestampToDateTime(timeNew).time);
                this_.timestampToDateTime(timeNew, true);
                $slider.slider('option','value', timeNew);

                this_.points[this_.frame || 0].timePassed = timeNew;    //запоминаем, сколько времени уже проигрывается точка

                this_.startTimeUpdater(timeNew);
            },1000);
        }else{
            clearTimeout(this_.timerUpdateTime);
        }
    }

    this.clear = function(){
        this_.points = [];
        clearTimeout(this_.timer);
        clearTimeout(this_.timerUpdateTime);
        this_.timer = null;
        this_.frame = 0;
    }

    this.stop = function(){
        this.isPlaying = false;
        this_.clear();
        $play.removeClass('active pause');
        $stop.addClass('disabled');
        $forward.addClass('disabled');
        $back.addClass('disabled');
        $slider.slider('option','disabled',true);
        console.log('--------- STOP --------- next frame = ' + this.frame);
    }

    this.pause = function(){
        console.log('--------- PAUSE ---------');
        clearTimeout(this_.timer);
        clearTimeout(this_.timerUpdateTime);
        $play.removeClass('pause');
    }

    this.forward = function(){
        if(!$forward.hasClass('disabled')) {
            this_.pause();
            $play.addClass('pause active');
            this_.points.length && this_.drawPoint(this_.points.length - 1, 0);
        }
    }

    this.back = function(){
        if(!$back.hasClass('disabled')){
            this_.pause();
            $play.addClass('pause active');
            this_.points.length && this_.drawPoint(0, 0);
        }
    }



    //-----------------------------------------------------------------------------> get points from server
    socket.on("load-track", function(points) {
        console.log('track loaded');
        if(points && points.length){

            /**
             * скорей всего время последней точки меньше времени окончания, потому
             * добавим в конец еще одну точку с временем, равным времени окончания,
             * чтобы не было ошибки, когда передвигаем ползунок слайдера в точку,
             * которая находится после времени последней точки
             */
            var pointLast = points[points.length-1];
            if(pointLast.timestamp < this_.timeEnd){
               points.push($.extend({}, pointLast, {timestamp: this_.timeEnd}));
            }

            this_.points = points;

            this_.realPlay();

        }else{
            alert('No points loaded!');
            this_.stop();
        }

    });


}


//------------------------->
var socket = io.connect('http://contentsrv.ibecom.ru', {path: "/tracker/socket.io"});

socket.on("connect", function () {
    console.log("Connected!");
});