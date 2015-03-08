"use strict";
Components.utils.import("chrome://thunderstats/content/dbutils/mzts-mdb.jsm");
//Components.utils.import("chrome://thunderstats/content/dbutils/mzts-storagedb.jsm");	// To be enabled in vesion 2.0
Components.utils.import("chrome://thunderstats/content/mzts-statscore.jsm");
Components.utils.import("chrome://thunderstats/content/mzts-utils.jsm");
Components.utils.import("resource://thunderstats/miczLogger.jsm");

var $jQ = jQuery.noConflict();

var miczThunderStatsTab = {

	currentTab:"#tab_today",
	data_7days_sent:new Array(),
	data_7days_rcvd:new Array(),

	onLoad: function(){
			miczLogger.setLogger(document.getElementById('log_wrapper'),document);
			miczLogger.log("ThunderStats starting...",0);

			//Setting the correct locale to display dates and times
			moment.locale(miczThunderStatsUtils.getCurrentSystemLocale());

			miczThunderStatsDB.init();
			//miczThunderStatsStorageDB.init();	// To be enabled in vesion 2.0
			miczLogger.log("Opening databases...",0);

			miczLogger.log("Loading identities...",0);
			miczThunderStatsCore.loadIdentities();
			//dump('>>>>>>>>>>>>>> [miczThunderStatsTab] miczThunderStatsCore.identities '+JSON.stringify(miczThunderStatsCore.identities)+'\r\n');

			miczLogger.log("Identities found: "+miczThunderStatsCore.identities.length,0);

			let id_selector = document.getElementById('identities_selector');
			for(let key in miczThunderStatsCore.identities){
				let opt = document.createElement('option');
				opt.value = miczThunderStatsCore.identities[key]["id"];
				opt.innerHTML = miczThunderStatsUtils.escapeHTML(miczThunderStatsCore.identities[key]["fullName"]+" ("+miczThunderStatsCore.identities[key]["email"]+")");
				//dump(">>>>>>>>>>>>>> [miczThunderStatsTab] miczThunderStatsCore.identities.length "+miczThunderStatsCore.identities.length+"\r\n");
				id_selector.appendChild(opt);

				if(miczThunderStatsCore.identities.length==1){	//If there is only one identity, autochoose it
					//dump(">>>>>>>>>>>>>> [miczThunderStatsTab] id_selector autochoosing.\r\n");
					$jQ("#identities_selector").val(miczThunderStatsCore.identities[key]["id"]);
					$jQ("#identities_selector").change();
				}
			}

			miczLogger.log("Identities loaded.",0);
			miczLogger.log("ThunderStats ready.",0);

			miczThunderStatsTab.getTodayStats(miczThunderStatsTab.getCurrentIdentityId());
			miczThunderStatsTab.getLastIndexedMessage();

			id_selector.onchange=miczThunderStatsTab.updateStats;

			miczThunderStatsDB.close();
			//miczThunderStatsStorageDB.close();	 // To be enabled in vesion 2.0
		},

	getTodayStats:function(identity_id){
		miczLogger.log("Getting today statistics...",0);

		//Show loading indicators
		miczThunderStatsTab.ui.showLoadingElement("today_sent_wait");
		miczThunderStatsTab.ui.showLoadingElement("today_rcvd_wait");
		miczThunderStatsTab.ui.showLoadingElement("today_recipients_wait");
		miczThunderStatsTab.ui.showLoadingElement("today_senders_wait");

		//Print dates
		$jQ("#today_date").text(miczThunderStatsUtils.getTodayString(moment));

		//Today
		//Get today sent messages
		miczThunderStatsCore.db.getTodayMessages(1,identity_id,miczThunderStatsTab.callback.homepage_stats_today_sent);

		//Get today received messages
		miczThunderStatsCore.db.getTodayMessages(0,identity_id,miczThunderStatsTab.callback.homepage_stats_today_rcvd);

		//Get today first 10 recipients
		miczThunderStatsCore.db.getTodayInvolved(1,identity_id,miczThunderStatsTab.callback.homepage_stats_today_recipients);

		//Get today first 10 senders
		miczThunderStatsCore.db.getTodayInvolved(0,identity_id,miczThunderStatsTab.callback.homepage_stats_today_senders);

		//Inbox 0 Today
		//Get today mails folder spreading
		miczThunderStatsCore.db.getTodayMessagesFolders(0,identity_id,miczThunderStatsTab.callback.stats_today_inbox0_folders);

		//Get inbox mails date spreading
		//TODO
	},

	getYesterdayStats:function(identity_id){
		miczLogger.log("Getting yesterday statistics...",0);

		//Show loading indicators
		miczThunderStatsTab.ui.showLoadingElement("yesterday_sent_wait");
		miczThunderStatsTab.ui.showLoadingElement("yesterday_rcvd_wait");
		miczThunderStatsTab.ui.showLoadingElement("yesterday_recipients_wait");
		miczThunderStatsTab.ui.showLoadingElement("yesterday_senders_wait");

		//Print dates
		$jQ("#yesterday_date").text(miczThunderStatsUtils.getYesterdayString(moment));

		//Yesterday
		//Get yesterday sent messages
		miczThunderStatsCore.db.getYesterdayMessages(1,identity_id,miczThunderStatsTab.callback.homepage_stats_yesterday_sent);

		//Get yesterday received messages
		miczThunderStatsCore.db.getYesterdayMessages(0,identity_id,miczThunderStatsTab.callback.homepage_stats_yesterday_rcvd);

		//Get yesterday first 10 recipients
		miczThunderStatsCore.db.getYesterdayInvolved(1,identity_id,miczThunderStatsTab.callback.homepage_stats_yesterday_recipients);

		//Get yesterday first 10 senders
		miczThunderStatsCore.db.getYesterdayInvolved(0,identity_id,miczThunderStatsTab.callback.homepage_stats_yesterday_senders);
	},

	getLast7DaysStats:function(identity_id){
		miczLogger.log("Getting last 7 days statistics...",0);

		//Show loading indicators
		miczThunderStatsTab.ui.showLoadingElement("7days_sent_wait");
		miczThunderStatsTab.ui.showLoadingElement("7days_rcvd_wait");
		miczThunderStatsTab.ui.showLoadingElement("7days_recipients_wait");
		miczThunderStatsTab.ui.showLoadingElement("7days_senders_wait");

		this.data_7days_sent=new Array();
		this.data_7days_rcvd=new Array();

		let mToDay = new Date();
		let mFromDay = new Date();
		mFromDay.setDate(mFromDay.getDate() - 6);

		//Get sent messages
		miczThunderStatsCore.db.getManyDaysMessages(1,mFromDay,mToDay,identity_id,miczThunderStatsTab.callback.stats_7days_sent);

		//Get received messages
		miczThunderStatsCore.db.getManyDaysMessages(0,mFromDay,mToDay,identity_id,miczThunderStatsTab.callback.stats_7days_rcvd);

		//Get first 10 recipients
		miczThunderStatsCore.db.getManyDaysInvolved(1,mFromDay,mToDay,identity_id,miczThunderStatsTab.callback.stats_7days_recipients);

		//Get first 10 senders
		miczThunderStatsCore.db.getManyDaysInvolved(0,mFromDay,mToDay,identity_id,miczThunderStatsTab.callback.stats_7days_senders);
	},

	getCurrentIdentityId:function(){
		let id_selector = document.getElementById("identities_selector");
		return id_selector.options[id_selector.selectedIndex].value;
	},

	updateStats: function(){
		miczThunderStatsTab.ui.updateTab(miczThunderStatsTab.currentTab);
	},

	getLastIndexedMessage: function(){
		miczThunderStatsDB.queryGetLastMessageDate(miczThunderStatsTab.callback.last_idx_msg);
	},

	doStats: function(){
			let identity_id = this.getCurrentIdentityId();

			let output=new Array();
			miczThunderStatsDB.init();
			//miczThunderStatsStorageDB.init();	 // To be enabled in version 2.0

			this.getTodayStats(identity_id);

			/*let rows=miczThunderStatsDB.queryMessages(1,Date.parse('2014/12/01'),Date.now(),identity_id);
			output.push("<b>Sent messages from 01/12/2014 to today:</b> "+rows[0][0]+"<br/>");

			let rows2=miczThunderStatsDB.queryMessages(0,Date.parse('2014/12/01'),Date.now(),identity_id);
			output.push("<b>Received messages from 01/12/2014 to today:</b> "+rows2[0][0]+"<br/>");
			output.push("<br/>");

			let rows3=miczThunderStatsDB.queryGetNumInvolved(1,Date.parse('2014/12/01'),Date.now(),identity_id,10);
			output.push("<b>Top 10 Recipient from 01/12/2014 to today:</b> <br/>");
			for(let key in rows3){
				output.push(rows3[key][1]+" "+rows3[key][2]+" ("+rows3[key][3]+")<br/>");
			}
			output.push("<br/>");

			let rows4=miczThunderStatsDB.queryGetNumInvolved(0,Date.parse('2014/12/01'),Date.now(),identity_id,10);
			output.push("<br/><b>Top 10 Sender from 01/12/2014 to today:</b> <br/>");
			for(let key in rows4){
				output.push(rows4[key][1]+" "+rows4[key][2]+" ("+rows4[key][3]+")<br/>");
			}
			output.push("<br/>");

			let rows4=miczThunderStatsDB.queryGetAttachments(1,Date.parse('2014/12/01'),Date.now(),identity_id);
			output.push("<b>Sent attachments from 01/12/2014 to today:</b> "+rows4[0][0]+"<br/>");
			let rows5=miczThunderStatsDB.queryGetAttachments(0,Date.parse('2014/12/01'),Date.now(),identity_id);
			output.push("<b>Received attachments from 01/12/2014 to today:</b> "+rows5[0][0]+"<br/>");
			output.push("<br/>");*/

			/*let rows6=miczThunderStatsCore.db.getTodayMessages(1,identity_id);
			output.push("<b>Today sent messages:</b> "+rows6[0][0]+"<br/>");
			output.push("<br/>");*/

			/*let rows7=miczThunderStatsDB.queryGetLastMessageDate();
			//dump('>>>>>>>>>>>>>> [miczThunderStatsTab] '+JSON.stringify(rows7)+'\r\n');
			let rows7_date=new Date(rows7[0][0]/1000);
			output.push("<b>Last message date:</b> "+rows7_date.toString()+"<br/>");
			output.push("<br/>");

			document.getElementById("test_output").innerHTML=output.join('');*/

			//miczThunderStatsCore.db.getTodayMessages(1,identity_id,miczThunderStatsTab.callback.test);
			//miczThunderStatsCore.db.getYesterdayMessages(1,identity_id,miczThunderStatsTab.callback.test);

			//miczThunderStatsDB.queryGetNumInvolved(1,Date.parse('2014/12/01'),Date.now(),identity_id,10,miczThunderStatsTab.callback.test);

			//miczThunderStatsStorageDB.insertNewDay(identity_id,new Date(),miczThunderStatsTab.callback.day_cache_test);

			//dump('>>>>>>>>>>>>>> [miczThunderStatsTab] miczThunderStatsTab.callback.test '+(typeof miczThunderStatsTab.callback.test)+'\r\n');


			/*let fd=new Date('2014/12/01');
			let td=new Date('2014/12/10');
			miczThunderStatsUtils.getDaysFromRange(fd,td);*/

			miczThunderStatsDB.close();
			//miczThunderStatsStorageDB.close();	 // To be enabled in vesion 2.0
	},

};

window.addEventListener("load", miczThunderStatsTab.onLoad, false);
