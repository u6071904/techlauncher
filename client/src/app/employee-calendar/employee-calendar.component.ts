import {Component, Input, OnInit, ViewChild, TemplateRef} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import 'fullcalendar';
import {NgbModal} from '@ng-bootstrap/ng-bootstrap';
import {MyEvent} from '../my-event';
import {Npd} from '../npd';
import { NgModel } from '@angular/forms';
import {ActivatedRoute, Router } from '@angular/router';
import {forEach} from "@angular/router/src/utils/collection";
import {Observable} from "rxjs/Observable";


@Component({
  selector: 'app-employee-calendar',
  templateUrl: './employee-calendar.component.html',
  styleUrls: ['./employee-calendar.component.css']
})
export class EmployeeCalendarComponent implements OnInit {
  @ViewChild("content") dialogModal: TemplateRef<any>

  @ViewChild("deletePopWindow") deleteModal: TemplateRef<any>

  // #colon is for type and = is assignment
	employees: any;
	holidays : any;
	npdIDs:any[];
  npds = [];
  fromDate :Date;
  toDate :Date;
  events = ['select', 'RDO', 'Annual Leave', 'Sick Leave', 'Other'];
  public model = new MyEvent(this.events[0]);
  radioBtn1: String;
  repeatVal: 0;
	initial: number;
	selectedEmployeeId:number;
  npd = new Npd(this.fromDate, this.toDate, this.model.event, this.selectedEmployeeId, 0);
  deletedEvent: any;


  constructor(
    private http: HttpClient,
    private modalService: NgbModal
  ) {
      this.repeatVal = 0;
      this.npd       = new Npd(this.fromDate, this.toDate, this.model.event, this.selectedEmployeeId, 0);
      this.initial   = -1;
      this.selectedEmployeeId=1;
      this.deletedEvent = [];
  }


	getPublicHoliday() {
		this.http.get('http://localhost:8080/holidays?max=30').subscribe(data => {
			this.holidays = data;
			//this.displayCalendar()

		});
	}

	getEmployee(){
		this.http.get('http://localhost:8080/employee?max=30').subscribe(data=>{
			this.employees = data;

			this.getnpds();
		});
	}


	getnpd(i,index,l){
		this.http.get('http://localhost:8080/npd/'+i).subscribe(data=>{
			this.npds.push(data);
			console.log(this.npds)
			if(index==l){
				this.displayCalendar();
			}
		});
	}

	getnpds(){
		this.npds=[];
  	this.http.get('http://localhost:8080/employee/'+this.selectedEmployeeId).subscribe(data=>{
  		this.npdIDs = data['npds'];
		  console.log(this.npdIDs);
		  var index = 0;
		  if(this.npdIDs.length!=0){
			  this.npdIDs.forEach(data =>{
				  index ++;
				  var i = data['npd_id'];
				  console.log(i);
				  this.getnpd(i,index,this.npdIDs.length);
			  });
		  }else {
		  	this.displayCalendar()
		  }

	  });
	}

	deleteEvent() {
		// we need to get employee id and its npd values
		// then compare all npd with the selected values
		// finally we can get its id.

		var npd_id = this.npds.map(npd =>
		{
			var npd_start    = new Date(npd.start);
			var delete_start = new Date(this.deletedEvent.start);
			var npd_end      = new Date(npd.end);
			var delete_end   = new Date(this.deletedEvent.end);

			if (npd.reason == this.deletedEvent.title &&
					npd_start.toDateString() == delete_start.toDateString() &&
					npd_end.toDateString() == delete_end.toDateString()) {
				return npd.npd_id;
			}
		});

		// get the first matched result from a list.
        for (var i = 0; i < npd_id.length; i++) {
        	if (npd_id[i] != undefined)
        		var id = npd_id[i];
        }


        // execute http delete and flush the page as well
		this.http.delete('http://localhost:8080/npd/' + id)
			.subscribe(res => {},
				(err) => {console.log(err);},
				() => {
				this.getnpds();
				});
	}

	saveEvent(){
		this.http.post('http://localhost:8080/npd', this.npd)
			.subscribe(res => {let id = res['id'];
				}, (err) => {
					console.log(err);
				},
				() => {
					this.getnpds();
				}
			);
	}

  addEvent(){
    if (this.radioBtn1 == 'always') {
        this.npd = new Npd(this.fromDate, this.toDate, this.model.event, this.selectedEmployeeId, 100);
		} else if (this.radioBtn1 == 'repeat') {
        this.npd = new Npd(this.fromDate, this.toDate, this.model.event, this.selectedEmployeeId, this.repeatVal);
		} else {
        this.npd = new Npd(this.fromDate, this.toDate, this.model.event, this.selectedEmployeeId, 1);
		}
	  this.saveEvent();
  }

	displayCalendar(){
		console.log('f2');
		$('#calendar').fullCalendar('removeEvents');
  	var hds = this.holidays.map(holiday => {
  		return {
			  title: holiday.name,
			  start: holiday.start.split('T')[0],
			  end: holiday.end.split('T')[0],
			}
	  });

		if (this.npds != null) {
			var ndsWithRepeat = this.npds.map(npd => {
				return {
					title: npd.reason,
					start: npd.start.split('T')[0],
					end: npd.end.split('T')[0],
					repeat: npd.repeatDays
				}
			});

			var nds = [];
			for (var i = 0; i < ndsWithRepeat.length; i++) {
				for (var j = 0; j < ndsWithRepeat[i].repeat; j++) {
					var startDate = new Date(ndsWithRepeat[i].start);
					var endDate = new Date(ndsWithRepeat[i].end);

					startDate.setDate(startDate.getDate() + j * 7);
					endDate.setDate(endDate.getDate() + j * 7);

					nds.push({
						title: ndsWithRepeat[i].title,
						start: startDate,
						end:   endDate,
						color: '#cc0000',
					})
				}
			}
		}

		var allEvents = hds.concat(nds);
		$('#calendar').fullCalendar( {
			header: {
				left: 'prev,next today',
				center: 'title',
				right: 'month,listYear'
			},

      dayClick: (data, jsEvent, view) => {
        this.fromDate = data.format();
        this.toDate = data.format();
        this.modalService.open(this.dialogModal);
        console.log('from', this.fromDate)
      },
      
      eventClick: (calEvent, jsEvent, view) => {
        // alert('Event: ' + calEvent.title);
		  this.deletedEvent.title = calEvent.title;
		  this.deletedEvent.start = calEvent.start._d;
		  this.deletedEvent.end   = calEvent.end._d;

        this.modalService.open(this.deleteModal);  
      },

			displayEventTime: false, // don't show the time column in list view

			events: allEvents,

			loading: function(bool) {
				$('#loading').toggle(bool);
			}
		});

		$("#calendar").fullCalendar('removeEvents');
		$("#calendar").fullCalendar('addEventSource', allEvents);
  }

  //toDateChange(event) {
    //console.log('to', this.toDate)
  //}

  ngOnInit() {
	  this.getPublicHoliday();
	  this.getEmployee();
	  //this.getnpds();
  }

}
