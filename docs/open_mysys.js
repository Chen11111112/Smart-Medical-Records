/**
 * 這是刪去機密資料後的專案後端，DEMO 並不會實際進行查詢，只會回傳假資料。
 * 院方整合範例：請將 DEMO_API_BASE 改為實際部署網址。
 */
function opensmarters() {
	var icdList = [];

	$("input[name$='.ericd']").each(function(index) {

	    var icd = $.trim($(this).val());

	    if (icd !== "") {

	        var description = $(this)
	            .closest("tr")
	            .next("tr")
	            .find("span")
	            .text();

	        icdList.push({
	            id: icd,
	            zhName: "",
	            enName: $.trim(description),
	            use: 0
	        });
	    }
	});
	
	var criteria = {
	    histno: "${fn:trim(histno)}",
	    caseno: "${caseno}",
	    docid: "${fn:trim(sessionScope['scopedTarget.userPreferences'].id)}",

	    vitals: {
	        bp_s: $("input[name='erdta03']").val(),
	        bp_d: $("input[name='erdta031']").val(),
	        bt: $("input[name='erdta06']").val(),
	        pr: $("input[name='erdta04']").val(),
	        rr: $("input[name='erdta05']").val(),
	        bw: $("input[name='erditkg1']").val(),
	        painAssessment: $("input[name='erdta032']").val()
	    },

	    medicalInfo: {
	        chiefComplaint: $("textarea[name='erdia01']").val(),
	        presentIllness: $("textarea[name='erdia04']").val(),
	        pastHistory: $("textarea[name='erdia08']").val(),

	        generalCondition: $("textarea[name='erdib01']").val(),
	        heent: $("input[name='erdib03']").val(),
	        neck: $("input[name='erdib04']").val(),
	        chestAndLungs: $("textarea[name='erdib05']").val(),
	        abdomen: $("textarea[name='erdib07']").val(),
	        backAndSpine: $("input[name='erdib09']").val(),
	        exogenitalia: $("input[name='erdib10']").val(),
	        rectalExam: $("input[name='erdib11']").val(),
	        extremities: $("input[name='erdib12']").val(),
	        neurologicalExam: $("input[name='erdib13']").val(),

	        icdList: icdList
	    }
	};
	
	console.log(criteria);

    var DEMO_API_BASE = "http://localhost:3000";

    $.ajax({
        url: DEMO_API_BASE + "/api/external-session",
        type: "POST",
        contentType: "application/json; charset=UTF-8",
        dataType: "json",
        processData: false,
        data: JSON.stringify({
            criteria: criteria
        }),
        success: function(response) {

            console.log(response);

            if (response.success) {
                $('#smartersFuncDialog').dialog('close');
                 window.open(DEMO_API_BASE + response.redirectUrl, "_blank");
            } else {
                alert("智慧病歷回傳失敗");
            }
        },
        error: function(xhr, status, error) {
            console.error(xhr.responseText);
            alert("呼叫智慧病歷 API 失敗");
        }
    });
}
