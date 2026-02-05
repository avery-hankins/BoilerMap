# geocode_purdue.py
# Requires:
#   pip install geopy requests
#
# Save and run:
#   python geocode_purdue.py

import time
import json
import math
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter

# --- paste or import your building list here (trimmed for brevity in this example) ---
buildings = [
  {"id":"052363e2-c8c4-46ad-bf6a-5ca5e310e848","name":"Seng-Liang Wang Hall","code":"WANG"},
  {"id":"05a0e637-a2f6-4597-b863-c56ffa76d631","name":"Materials and Electrical Engr","code":"MSEE"},
  {"id":"20110923-383a-4b59-8cb2-60e4a69d20ca","name":"Neil Armstrong Hall of Engr","code":"ARMS"},
  {"id":"23c504d0-1f22-4b37-863a-a6f54ef5adfe","name":"Max W & Maileen Brown Hall","code":"BHEE"},
  {"id":"24ccf23b-c3c8-416e-b59a-34e30e30c99b","name":"Asynchronous Online Learning","code":"ASYNC"},
  {"id":"4d1125e5-9edb-4fb8-8347-a11509c56945","name":"Lawson Computer Science Bldg","code":"LWSN"},
  {"id":"50b2c89c-df49-49e2-92e8-57d55b9c835b","name":"Wilmeth Active Learning Center","code":"WALC"},
  {"id":"5168cf30-9b99-4c81-8f66-9b7047fb5522","name":"Beering Hall of Lib Arts & Ed","code":"BRNG"},
  {"id":"516da14e-0dad-4f20-bca5-8e68625ee201","name":"Synchronous Online Learning","code":"SYNC"},
  {"id":"571b87b2-4ddb-42ce-be49-edd31740ce16","name":"Robert Heine Pharmacy Building","code":"RHPH"},
  {"id":"58d31510-8e0a-4521-a77c-f1e67f9c61c8","name":"Stewart Center","code":"STEW"},
  {"id":"6df16842-b638-4648-a0b2-643fe9231ade","name":"Asynchronous Online Learning","code":"ASYNC"},
  {"id":"9d9b5678-286f-4418-9339-f18f16a25519","name":"Physics Building","code":"PHYS"},
  {"id":"9de5c393-484d-4781-859f-62dcebad9eb5","name":"Forney Hall of Chemical Engr","code":"FRNY"},
  {"id":"a0601aa1-6c73-4225-b4b9-4e5ec0898284","name":"Wetherill Lab of Chemistry","code":"WTHR"},
  {"id":"a58cc3e5-f4d7-4f7f-907a-c3938f31b871","name":"Krannert Building","code":"KRAN"},
  {"id":"aa745652-21ff-4d5f-aa2e-b252e8f9bbc3","name":"Armory","code":"AR"},
  {"id":"b6bbd567-afc6-4244-a966-9fe686d1eb44","name":"Grissom Hall","code":"GRIS"},
  {"id":"c58d2c55-7ac6-46a8-a486-0cc230d39377","name":"TBA","code":"TBA"},
  {"id":"caed93fc-821a-41d7-b20f-b7aac399ffd7","name":"Potter Engineering Center","code":"POTR"},
  {"id":"e82e14cb-6820-4f6d-8450-1725aec0b0f7","name":"Chaffee Hall","code":"CHAF"},
  {"id":"ff6393f7-40cd-43c5-8f69-b706799e2b85","name":"Hampton Hall of Civil Engnrng","code":"HAMP"},
  {"id":"3639b46f-db69-4e69-b8cf-9cfa2b122fa8","name":"Horticulture Building","code":"HORT"},
  {"id":"5e5ce209-9082-4e6e-b774-dd317a0b5a51","name":"Morgan Ctr for Entrepreneurshp","code":"MRGN"},
  {"id":"646b08b6-9b5d-465f-b7eb-4b0cf9b76dc5","name":"ADM Agricultural Innovation Ct","code":"ADM"},
  {"id":"c9285c26-40f4-4dda-a426-fb87a63918fb","name":"Nelson Hall of Food Science","code":"NLSN"},
  {"id":"d249bba6-272b-4674-bc9d-ebd659d65874","name":"Brown Laboratory of Chemistry","code":"BRWN"},
  {"id":"e59bda6e-8cb8-491b-a877-12e7e6960385","name":"Agricultural & Biological Engr","code":"ABE"},
  {"id":"003bab14-62fd-4508-8bd1-1b4927627d49","name":"Pao Hall of Visual & Perf Arts","code":"PAO"},
  {"id":"2902bbc4-501a-4407-8dba-0957484dc198","name":"Hicks Undergraduate Library","code":"HIKS"},
  {"id":"b7367158-6b2c-423a-94af-d7adfcc161f6","name":"Forestry Building","code":"FORS"},
  {"id":"d7be8b62-d201-4176-acbf-92cf9e2ccf3c","name":"Lilly Hall of Life Sciences","code":"LILY"},
  {"id":"f0bfc56a-e169-4abb-a82f-358a6ddb6672","name":"Forest Products Building","code":"FPRD"},
  {"id":"30dc6e73-c1b5-4579-9aa2-355004e03217","name":"Class of 1950 Lecture Hall","code":"CL50"},
  {"id":"42a7ab17-f4d2-458b-91a2-01daa0663483","name":"On-site","code":"OFFCMP"},
  {"id":"6cca972e-ea6c-4eea-be9f-3ba86d8b8cd8","name":"University Church","code":"UC"},
  {"id":"7d390978-bb4d-4043-8d03-18a5af10b17c","name":"Stanley Coulter Hall","code":"SC"},
  {"id":"cecc472e-bb71-44f1-b886-0c4daa65674f","name":"Jerry S Rawls Hall","code":"RAWL"},
  {"id":"f6a260dc-86f6-405a-afbf-85787d6d95ce","name":"Smith Hall","code":"SMTH"},
  {"id":"4a3e8305-e8ff-4857-85a3-0b15de0e421f","name":"Matthews Hall","code":"MTHW"},
  {"id":"92fa7619-8de2-4af4-8e04-ca1f7fc07077","name":"Helen B. Schleman Hall","code":"SCHM"},
  {"id":"cfd209ad-c70b-4888-bac9-2ea062a29edb","name":"Biochemistry Building","code":"BCHM"},
  {"id":"fb71ba23-da36-4958-831e-0b916570b0d8","name":"Knoy Hall of Technology","code":"KNOY"},
  {"id":"316d74b0-a636-4b62-bb72-4b27d2f03844","name":"Daniel Turfgrass Rsch&Diag Ct","code":"DANL"},
  {"id":"aab46ca7-4beb-4068-a56e-ebf51f56348f","name":"Psychological Sciences Bldg","code":"PSYC"},
  {"id":"d7bd866f-cb10-4887-858e-e9f7fb06ae1c","name":"University Hall","code":"UNIV"},
  {"id":"f760db48-71ea-4368-ad2a-08383a02506e","name":"Heavilon Hall","code":"HEAV"},
  {"id":"5dda14ae-3cea-4840-96d4-6a6d5ddc4f74","name":"Lambert Field House & Gym","code":"LAMB"},
  {"id":"045c2355-75cc-4938-984f-71e6a673c3b4","name":"Creighton Hall of Animal Sci","code":"CRTN"},
  {"id":"778658e4-7064-4aa4-81a8-721982cea1d9","name":"Land O Lakes Ctr","code":"LOLC"},
  {"id":"de65bbda-05cd-4ab4-aa51-fe1a20f332f4","name":"Winthrop E. Stone Hall","code":"STON"},
  {"id":"e2d701ce-f0b5-4e61-9b2b-41d9803607d3","name":"Eleanor B Shreve Residence Hal","code":"SHRV"},
  {"id":"1313e24e-90ad-49ac-b3e2-039c70e85493","name":"TBA","code":"TBA"},
  {"id":"25ac9e24-3c09-4499-97bb-6b011a9e8e2d","name":"TBA","code":"TBA"},
  {"id":"7f91397f-8a16-4355-a8eb-dc6899e69ef6","name":"TBA","code":"TBA"},
  {"id":"b3623c1e-2d2f-45f1-852a-cc8d5be102f0","name":"TBA","code":"TBA"},
  {"id":"e3fa0c97-5c8b-422a-bc2e-c829f6794cb4","name":"TBA","code":"TBA"},
  {"id":"bcae8230-4cf5-4c0e-bb71-4b9f6872b85e","name":"Lyles-Porter Hall","code":"LYLE"},
  {"id":"4e9812ba-87e7-4688-ae0c-93e880bc6e1c","name":"TBA","code":"TBA"},
  {"id":"6b526a23-e273-489e-8af1-468c01451dfe","name":"Mechanical Engineering Bldg","code":"ME"},
  {"id":"7839d9b8-f213-4eb8-9617-951f8b4f07be","name":"Niswonger Aviation Tech Bldg","code":"NISW"},
  {"id":"89436141-f545-4cf3-8ab7-980b387b3bca","name":"Aerospace Science Lab-Hangar 3","code":"AERO"},
  {"id":"a215cfa9-5fcb-4842-846a-5dfd0826769e","name":"Terminal Building (Hangar 2)","code":"TERM"},
  {"id":"b22a44a0-0acc-4334-b982-5688b4a26ae4","name":"Indiana Manufcturing Institute","code":"IMI"},
  {"id":"c483285a-a053-41fd-81b3-6393ea3172ae","name":"Composites Laboratory","code":"COMP"},
  {"id":"c62c8380-924a-4483-a2bb-87a41a6d4f59","name":"Holleman-Niswonger Simultr Ctr","code":"SIML"},
  {"id":"d8737185-5e4e-458e-a21b-06f09ae1aa17","name":"TBA","code":"TBA"},
  {"id":"e889294e-94c2-47ea-8eff-da824a0b11eb","name":"Jischke Hall of Biomedical Eng","code":"MJIS"},
  {"id":"e5be87b7-1786-4d30-9ea5-a0cf1b4c19fc","name":"Asynchronous Online Learning","code":"ASYNC"},
  {"id":"9cee8851-af64-44d8-a433-9086363c50bf","name":"Marc & Sharon Hagle Hall","code":"HAGL"},
  {"id":"1782e8fa-6ea6-4470-9886-c87b532684a5","name":"Chaney-Hale Hall of Science","code":"CHAS"},
  {"id":"0815b883-0b7a-43d0-ae1a-ff36902155cb","name":"Veterinary Pathology Building","code":"VPTH"},
  {"id":"b6e149ca-ee01-44d2-a2d2-aeb7e22b2f34","name":"Lynn Hall of Vet Medicine","code":"LYNN"},
  {"id":"bc5306d6-294a-472a-b607-c03159b0cfe1","name":"Felix Haas Hall","code":"HAAS"},
  {"id":"095302b2-01a4-4e60-8f53-0e06d352f334","name":"Synchronous Online Learning","code":"SYNC"},
  {"id":"1a56da5f-d1e2-45b4-9748-4be8ce3b4f2b","name":"Purdue Technology Center","code":"SEI"},
  {"id":"750b2fca-98ec-44cc-b3cc-02b6ab520a29","name":"Dudley Hall","code":"DUDL"},
  {"id":"88649cbc-c6cc-401e-9f7a-eda250b6c165","name":"McDaniel Hall","code":"MHALL"},
  {"id":"b3590085-32d1-407c-98f7-46479d46a01c","name":"Muncie Central","code":"MCHS"},
  {"id":"882abad7-cb1f-4557-a4f7-031bc1b0eaab","name":"Purdue Polytechnic Anderson","code":"PPA"},
  {"id":"70509f43-8f3d-4321-b605-c4ffb661ddf4","name":"TBA","code":"TBA"},
  {"id":"4dd88460-8d9e-49c2-94d9-f3fb8f10bd92","name":"Synchronous Online Learning","code":"SYNC"},
  {"id":"56c0ccf7-ca16-4407-af4c-97e97f26af60","name":"Learning Center","code":"LC"},
  {"id":"6f407433-a7fb-435d-ae4c-175d5271f0b4","name":"Synchronous Online Learning","code":"SYNC"},
  {"id":"77cdaaa9-73c0-42e0-ae16-d84ccce7616f","name":"Inventrek Technology Park","code":"INVTRK"},
  {"id":"7816ffb3-5a31-4531-8167-8cff0de9bea5","name":"Synchronous Online Learning","code":"SYNC"},
  {"id":"ae2f1c7e-3a86-42ff-b5d6-8f1ee5d39754","name":"Asynchronous Online Learning","code":"ASYNC"},
  {"id":"bd012d62-1be1-4b44-be5f-b3c457d5b4c6","name":"Advanced Manufacturing Center","code":"AMCE"},
  {"id":"f08811f8-0a3c-4f51-a9a3-04f7ad36b197","name":"Mathematical Sciences Building","code":"MATH"},
  {"id":"e8d1a942-f566-4a00-a998-ca763a80e9ed","name":"TBA","code":"TBA"},
  {"id":"461426d4-12ea-4f5a-bcaf-1b633f0da350","name":"TBA","code":"TBA"},
  {"id":"68d7fc6b-9f92-489e-92e6-2c7bf38c32e2","name":"Animal Disease Diagnostic Lab","code":"ADDL"},
  {"id":"a4b0b195-43c6-4fda-bde3-ebae41084272","name":"Vet Pathobiology Research Bldg","code":"VPRB"},
  {"id":"024ad7cf-fef9-476b-a2c7-4ba990a692c2","name":"Studebaker Building","code":"SBST"},
  {"id":"35de8ddd-02ce-49cf-9461-b8e12a623d44","name":"Asynchronous Online Learning","code":"ASYNC"},
  {"id":"8d74dbe1-ee80-470e-9c95-09e35aaf7528","name":"Brees Student-Athlete Acad Ctr","code":"BRES"},
  {"id":"aa82136d-3144-4734-93f8-ebec4094330d","name":"Krach Leadership Center","code":"KRCH"},
  {"id":"63d9b6b3-d754-4a6c-a327-120b77a2ea48","name":"Ernest C. Young Hall","code":"YONG"},
  {"id":"c5016027-656c-4578-8789-bdbb2a6744b2","name":"Lambertus Hall","code":"LMBS"},
  {"id":"08ce6f99-ffaa-4caa-b5e4-706ce8474248","name":"Asynchronous Online Learning","code":"ASYNC"},
  {"id":"466cc1ff-6641-4276-b2be-4f823d917597","name":"Purdue Polytechnic Anderson","code":"PPA"},
  {"id":"cea8a703-9230-4884-be95-0d5377b5649f","name":"Pfendler Hall of Agriculture","code":"PFEN"},
  {"id":"e5b1e896-4932-49a4-a9f7-28eedacef6a2","name":"John S. Wright Forestry Center","code":"WRIT"},
  {"id":"ba553702-15fd-4ab0-9242-ba09a7b3bb7b","name":"Drug Discovery Bldg","code":"DRUG"},
  {"id":"cb9f179b-bc76-4206-9073-dbba8a3226dd","name":"Winifred Parker Residence Hall","code":"PKRW"},
  {"id":"3e1a3926-98bb-4ebd-81f0-c7592e79e6e6","name":"Bill and Sally Hanley Hall","code":"HNLY"},
  {"id":"43bff18f-6e90-4cce-978b-1c653eb166e6","name":"Fowler Memorial House","code":"FWLR"},
  {"id":"ee3b9334-f543-4d6d-8a68-deb0ba555da8","name":"Cordova Rec Sports Center","code":"CREC"},
  {"id":"7614ee35-cd58-48ae-92ab-9398a3a1402c","name":"Honors College&Resid North","code":"HCRN"},
  {"id":"960ed208-b8aa-4e17-9023-9554315655ff","name":"Honors College&Resid South","code":"HCRS"},
  {"id":"f885c4b5-32b2-4c98-9aee-8ca2dcb90725","name":"Horticultural Greenhouse","code":"HGRH"},
  {"id":"1907cbc1-58d0-402e-b1b6-99832002dfe4","name":"Marriott Hall","code":"MRRT"},
  {"id":"6b145bdd-235a-4139-8520-294f448cfade","name":"Technology Building","code":"TECHB"},
  {"id":"53bfc2ab-dd93-4670-b73e-825e25f202c7","name":"Aviation Technology Center","code":"ATC"},
  {"id":"7081b16f-9cef-45ca-a5f1-a92eae6a60d9","name":"Synchronous Online Learning","code":"SYNC"},
  {"id":"f33039ba-2da9-4435-ab17-527d32f2a066","name":"Synchronous Online Learning","code":"SYNC"},
  {"id":"41b1e82a-89e7-466c-a5bd-15b3014a1d53","name":"Asynchronous Online Learning","code":"ASYNC"},
  {"id":"b1d412c8-4bc2-4567-8dc7-98f5afedbf2d","name":"Asynchronous Online Learning","code":"ASYNC"},
  {"id":"366bf9b6-649a-43a6-ae8b-a37f853f9251","name":"Krannert Building","code":"KRAN"},
  {"id":"73f54cea-e166-42e6-9ec1-43d51fa21d8a","name":"Birk Nanotechnology Center","code":"BRK"},
  {"id":"80728d8a-9b1d-465d-a843-d492f07ce65a","name":"Elliott Hall of Music","code":"ELLT"},
  {"id":"9d8b8499-d37d-4275-b873-be40558c18e1","name":"Johnson Hall of Nursing","code":"JNSN"},
  {"id":"d0e83670-0a11-4a93-908a-c48f01e36866","name":"Training & Reception Center ROOM","code":"TRC"},
  {"id":"5bd578ce-b795-48d7-b343-a5143b7f1b56","name":"Purdue Memorial Union","code":"PMU"},
  {"id":"66214ecf-48b9-4087-a938-958be8d26515","name":"Schwartz Tennis Center","code":"SCHW"},
  {"id":"e132e865-b942-418d-8240-540346993bac","name":"Johnson Hall","code":"JHALL"},
  {"id":"6f2cf758-0283-42da-a4db-b8a2175cc0fc","name":"Peirce Hall","code":"PRCE"},
  {"id":"79f60246-cf8f-4599-a267-3483e247ebb1","name":"Hillenbrand Residence Hall","code":"HILL"},
  {"id":"90597045-75f7-4f96-841c-937d9090eca2","name":"Homeland Security Building","code":"HSB"},
  {"id":"678471d6-3358-4d52-bb36-39f713f09bee","name":"Equine Health Sciences Bldg","code":"EHSB"},
  {"id":"b81be867-4f6b-4490-8270-052bf8269e46","name":"Equine Health Sciences Annex","code":"EHSA"},
  {"id":"000489de-9ddc-4465-9904-407679ff80a3","name":"Bechtel Innovation Design Ctr","code":"BIDC"},
  {"id":"01642ea6-d0c6-4083-854c-daa498ae0fec","name":"Flex Lab","code":"FLEX"},
  {"id":"a67c533c-1e39-47df-866c-153190318fa4","name":"Bindley Bioscience Center","code":"BIND"},
  {"id":"65ea171c-415d-4620-b6b7-af10d4520a84","name":"Jerry S Rawls Hall","code":"RAWL"},
  {"id":"fb311b9a-7782-4931-8fc9-189e30ddf728","name":"TBA","code":"TBA"},
  {"id":"95899a8e-9e8e-431d-9fbc-fbf46cc43f05","name":"Synchronous Online Learning","code":"SYNC"},
  {"id":"67492b6f-6022-4f21-9b33-b787d3fd3910","name":"Herrick Laboratories","code":"HLAB"},
  {"id":"b05560d5-0ddf-4b95-b95b-0be1137b52c0","name":"Cancelled","code":"CANCEL"},
  {"id":"b4a71fad-4b45-46cb-8347-19decddd4104","name":"Asian Amer & Asian Cult Ctr","code":"AACC"},
  {"id":"5591665d-ce29-4caa-8ca3-0f87d3af72db","name":"Asynchronous Online Learning","code":"ASYNC"},
  {"id":"a6f60d35-4add-4aa8-9b13-5303f1c9777c","name":"Main Street Resource Center","code":"MSRC"},
  {"id":"f10e55d9-6fc9-4ee3-8743-8ede025af26c","name":"Synchronous Online Learning","code":"SYNC"},
  {"id":"c66d646b-6701-40a0-996c-16815ff3c915","name":"Homeland Security & Public Ser","code":"HSPS"},
  {"id":"725639ee-741a-45f2-a847-a1def3e325cb","name":"OffSite","code":"OFST"},
  {"id":"ad644c4c-cf57-482d-ae20-fdf3f914685e","name":"Alexandria","code":"ALEX"},
  {"id":"a241a04f-b8a1-485e-8ab3-49e2a14f599f","name":"Recitation Building","code":"REC"},
  {"id":"f52fb877-0038-48bc-b2a8-25d3284f6332","name":"TBA","code":"TBA"},
  {"id":"2ba6114f-8b6e-4873-ac60-46a259ee3cde","name":"Griffin Residence Hall South","code":"GRFS"},
  {"id":"3cf9dfe9-ac0f-4b2f-9559-3afa1a12ab31","name":"State Farm","code":"SF"},
  {"id":"533bdc0c-a73e-4726-940a-9b6c762e7ab7","name":"Wetherill Lab of Chemistry","code":"WTHR"},
  {"id":"07ed10eb-1310-4520-b092-fe3ad4536581","name":"Slayter Ctr of Performing Arts","code":"SCPA"},
  {"id":"f2345bf3-8ade-4e99-b53e-99e9f38e8f21","name":"Krannert Center","code":"KCTR"},
  {"id":"0f620bc3-336e-41e9-a598-c77fe61790d8","name":"Electrical Engineering Bldg","code":"EE"},
  {"id":"13a54efa-94e0-4e5f-9520-79246a06c0d0","name":"Online","code":"ONLINE"},
  {"id":"c8585f19-e1b5-4150-8892-dd467a7a2f08","name":"Hockmeyer Hall Strc Bio","code":"HOCK"},
  {"id":"b443915b-34e4-4092-8e31-25170f261858","name":"The Innovation Center","code":"INVC"},
  {"id":"8eeb39b4-4b39-4b2f-8df4-04db4578953d","name":"Whistler Hall of Ag Research","code":"WSLR"},
  {"id":"02c545a1-1d36-48aa-90e8-c65974163bbc","name":"Technology Statewide Site","code":"TECHSW"},
  {"id":"aba2993e-e71d-4983-b9f0-af78fd4022b0","name":"Agricultural Administration","code":"AGAD"},
  {"id":"69ff85e5-3e1c-400d-995f-84184a1517ef","name":"Neil Armstrong Hall of Engr","code":"ARMS"},
  {"id":"f4e900a2-9535-4e79-8e26-86e1d93c5ced","name":"Michael Golden Labs and Shops","code":"MGL"},
  {"id":"9ae136a2-6cbe-47d2-a983-1ce8bff948a1","name":"Wilmeth Active Learning Center","code":"WALC"},
  {"id":"2b704d1b-df78-4133-9d36-5b189d4a0379","name":"Tom Spurgeon Golf Training Ctr","code":"SPUR"},
  {"id":"4bfd1be2-38fd-4e91-96ba-c15185f01bbf","name":"Ground Service Building","code":"GRS"},
  {"id":"43083c7f-7e17-477b-94a6-4e624296b7e6","name":"Third Street Suites","code":"TSS"},
  {"id":"afa933a5-6ea7-4769-99e5-f122c613c78f","name":"Nuclear Engineering Building","code":"NUCL"},
  {"id":"d2c18f7a-9694-4f4b-a549-0ba3789605ad","name":"Kepner Hall","code":"KPNR"},
  {"id":"f6f74438-9c38-4b24-8f34-b7b336498016","name":"Purdue Memorial Union Club","code":"PMUC"},
  {"id":"ad988a3d-04c3-4e8f-a669-43ada839f3cb","name":"Animal Sciences Teaching Lab","code":"ASTL"},
  {"id":"024b73a5-e20d-4952-ac74-1850f8805657","name":"Ross-Ade Stadium","code":"STDM"},
  {"id":"0919e9ef-a77d-4237-a066-a89509f31a2f","name":"Discovery and Learning","code":"DLR"},
  {"id":"5fc57a26-d7ef-43d4-bc21-91893a0f50dd","name":"On-site","code":"OFFCMP"},
  {"id":"982cac12-7f77-4a1e-918c-7b6104f16d05","name":"Black Cultural Center","code":"BCC"},
  {"id":"32fa3068-86b4-4c6e-a21c-4b325c4894b9","name":"Beering Hall of Lib Arts & Ed","code":"BRNG"},
  {"id":"8d2724b2-4b58-455a-b188-8af7ca307a8b","name":"Subaru Isuzu Automotive","code":"SIA"},
  {"id":"57eaeff4-d8d2-4f38-819d-2674f724b914","name":"Hansen Life Sciences Research","code":"HANS"},
  {"id":"4a0b7739-4826-4744-96bb-4780965d535f","name":"Guy J Mackey Arena","code":"MACK"},
  {"id":"0d3b058b-660b-4e46-915e-3e3cb7818956","name":"Ray W Herrick Laboratory","code":"HERL"},
  {"id":"ad5309ca-3118-408a-a13b-b5299f97d85c","name":"Harvey W. Wiley Residence Hall","code":"WILY"},
  {"id":"4216f421-44f7-487a-ac89-bec6fc3d8b0f","name":"Boilermaker Aquatic Center","code":"AQUA"},
  {"id":"4523af58-906e-4f84-bdac-5067bfe5c1cb","name":"INOK Investments Warehouse","code":"INOK"},
  {"id":"9cb1134d-6160-4401-baa2-33a276cfcf2c","name":"High Pressure Research Lab","code":"ZL3"},
  {"id":"4ed89e82-cc15-4722-84f6-4984821d7d09","name":"Engineering Administration","code":"ENAD"},
  {"id":"71f3213f-0281-49b5-9785-851e2235e1d7","name":"South Campus Courts Bldg B","code":"SCCB"},
  {"id":"2457b999-7da5-45ce-a429-480fe354c98d","name":"Civil Engineering Building","code":"CIVL"},
  {"id":"8368c3ea-0ba5-453b-9a05-86891a32a989","name":"Recreational Sports Center","code":"RSC"},
  {"id":"ee284cdc-effc-4c67-955d-86ac27078584","name":"Service Building","code":"SERV"},
  {"id":"c3c7d650-2a1b-41ce-8758-1caf9a828c98","name":"Technology Statewide Site","code":"TECHSW"},
  {"id":"548223e6-18bd-42f6-9ef5-59532200249a","name":"Child Developmt&Family Studies","code":"CDFS"},
  {"id":"c9ed4f7e-d2ec-49a0-8b9b-78ca07ded84f","name":"Civil Engineering Building","code":"CIVL"},
  {"id":"3c6ecb86-364a-47fb-b592-3e109452ad88","name":"Food Science Building","code":"FS"},
  {"id":"cefdf9ae-7866-44cf-ac87-0ab255714f42","name":"TBA","code":"TBA"},
  {"id":"e1b5b580-f969-456f-9f90-feb2c46a971a","name":"Technology Statewide Site","code":"TECHSW"},
  {"id":"d764b0a9-0c0e-41e7-bae2-e717578d4571","name":"Synchronous Online Learning","code":"SYNC"},
  {"id":"4b27b38f-ee75-41b9-8b72-cd8f062e335c","name":"Helen B. Schleman Hall","code":"SCHM"},
  {"id":"3ea6a160-aec5-4e60-be77-a6e2bcad00a1","name":"Asynchronous Online Learning","code":"ASYNC"},
  {"id":"69c56c8c-a45f-4562-bf2e-a956899f70ab","name":"Asynchronous Online Learning","code":"ASYNC"},
  {"id":"f61eacb7-5356-40cd-8978-6a6dbfb1f3a3","name":"TBA","code":"TBA"},
  {"id":"ac1fc983-d3d3-4ec3-9094-63d0b64f1fbc","name":"Engineering/Technology","code":"ET"},
  {"id":"e84434e5-cc7f-4b97-b050-26587bcd398d","name":"Science & Engineering Lab","code":"EL"},
  {"id":"a36c6b8b-72ca-4048-b80c-737a99f0ad9b","name":"Synchronous Online Learning","code":"SYNC"},
  {"id":"025f4566-71e4-4810-b1d6-3ff645a4fc19","name":"Innovation Hall","code":"IO"},
  {"id":"1538f6c3-65c4-4592-8d28-91485e03e9cb","name":"On-site","code":"OFFCMP"},
  {"id":"1c30c24d-4a6a-4db0-83b0-b27e7c2a9150","name":"Engr/Science & Tech","code":"SL"},
  {"id":"ab6b1e83-af39-48da-b2c9-f8a903df79c1","name":"Science Building","code":"LD"},
  {"id":"d008b634-31c1-4e6c-ad57-ae9babd5c86d","name":"Education/Social Work","code":"ES"},
  {"id":"a06fb790-f3b5-41f8-92d6-6aa2411c38ee","name":"ICTC","code":"ICTC"},
  {"id":"ddec987c-6ff1-4021-a15e-016ac0765193","name":"Lecture Hall","code":"LE"},
  {"id":"5879d464-e960-4fb0-ba6b-fac36484a2d4","name":"Cavanaugh Hall","code":"CA"},
  {"id":"8e1b875a-fcc7-4a70-9521-09f55dbebc00","name":"Business/SPEA","code":"BS"},
  {"id":"854e1fec-e516-4ec3-9487-f3586cac637f","name":"Hine Hall","code":"IP"},
  {"id":"01c6b1b7-2074-434c-a921-8c532ab0d1e7","name":"Nursing School","code":"NU"},
  {"id":"285569ec-bb23-431c-b8a3-077ec1a1b8ae","name":"Ezkenazi Hall","code":"HR"},
  {"id":"0da3fa71-7c8b-423b-a04b-862b43afb6eb","name":"University Hall","code":"UNIV"},
  {"id":"5fb224dc-35ee-4b15-9ea2-16b2222ab159","name":"North Hall","code":"HM"},
  {"id":"e10db5bb-749b-4a9e-9b56-2a0f9979878b","name":"Advanced Manufacturing Center","code":"AMCE"},
  {"id":"fcb7c27c-667c-456a-b4d1-92a23c4a34ff","name":"Synchronous Online Learning","code":"SYNC"},
  {"id":"24ee7c42-80fb-4857-a8c9-eebb6b4c0403","name":"Columbus Learning Center","code":"CLC"},
  {"id":"57f247f6-3abb-442b-96ee-9f53a8a409bf","name":"Indiana College Network","code":"ICN"},
  {"id":"c542c08e-07ac-40c7-8ecf-76d26fb5de87","name":"Hall of Data Science and AI","code":"DSAI"},
  {"id":"325bf338-527d-4fa2-8927-5f6c0e4aeab1","name":"Asynchronous Online Learning","code":"ASYNC"},
  {"id":"fdd01429-9f26-4a9f-a95f-2915b7e59353","name":"TBA","code":"TBA"},
  {"id":"ea65e111-2fb9-4ea9-9bca-8153e99c8157","name":"Mollenkopf Athletic Center","code":"MOLL"},
]


# --- configuration ---
USER_AGENT = "purdue_geocoder_script/1.0 chen4724@purdue.edu"
NOMINATIM_LIMIT = 8            # how many candidates to request per query
MIN_DELAY_SECONDS = 1          # rate limit between requests (polite)
Purdue_CENTER = (40.4237, -86.9212)  # [lat, lon] for distance fallback

# buildings to skip by code
SKIP_CODES = {"TBA","SYNC","ASYNC","OFFSITE","OFFCMP","ONLINE","CANCEL"}

def haversine_km(lat1, lon1, lat2, lon2):
    # returns distance in kilometers
    R = 6371.0088
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

def build_query(b):
    code = (b.get("code") or "").strip()
    if not code or code.upper() in SKIP_CODES:
        return None
    return f"{code}" #Purdue University West Lafayette IN

def candidate_matches_address(candidate_addr, country_code="us", state_contains="Indiana", city_contains="West Lafayette"):
    if not candidate_addr:
        return False
    if country_code:
        cc = (candidate_addr.get("country_code") or "").lower()
        if cc and cc != country_code.lower():
            return False
    if state_contains:
        st = (candidate_addr.get("state") or candidate_addr.get("region") or "").lower()
        if state_contains.lower() not in st:
            return False
    if city_contains:
        city = (candidate_addr.get("city") or candidate_addr.get("town") or candidate_addr.get("village") or candidate_addr.get("county") or "").lower()
        if city_contains.lower() not in city:
            return False
    return True

def pick_best_candidate(candidates, prefer_filter=True):
    """
    candidates: list of dicts with keys: lat, lon, display_name, address (dict)
    prefer_filter: if True, return first candidate that matches city/state/country
    fallback: if none matches, return candidate closest to Purdue center
    """
    if not candidates:
        return None

    if prefer_filter:
        for c in candidates:
            if candidate_matches_address(c.get("address", {})):
                return c

    # fallback: pick nearest to Purdue center
    best = None
    best_d = float("inf")
    for c in candidates:
        try:
            lat = float(c.get("lat"))
            lon = float(c.get("lon"))
        except Exception:
            continue
        d = haversine_km(lat, lon, Purdue_CENTER[0], Purdue_CENTER[1])
        if d < best_d:
            best_d = d
            best = c
    return best

def geocode_all(buildings, user_agent=USER_AGENT):
    geolocator = Nominatim(user_agent=user_agent, timeout=10)
    # RateLimiter wraps geolocator.geocode and allows passing exactly_one/limit/addressdetails for each call
    geocode = RateLimiter(geolocator.geocode, min_delay_seconds=MIN_DELAY_SECONDS, max_retries=2, error_wait_seconds=2)

    results = []
    for i, b in enumerate(buildings, start=1):
        query = build_query(b)
        entry = dict(b)
        entry["query"] = query

        if query is None:
            entry.update({
                "candidates": [],
                "lat": None,
                "lon": None,
                "display_name": None,
                "status": "skipped"
            })
            print(f"[{i}/{len(buildings)}] {b.get('code','?')} -> skipped")
            results.append(entry)
            continue

        try:
            # request multiple candidates and include address details
            # geocode(..., exactly_one=False, limit=N, addressdetails=True) returns a list of Location objects
            locs = geocode(query, exactly_one=False, limit=NOMINATIM_LIMIT, addressdetails=True)
            # geopy's RateLimiter returns None if no result, or a single Location if exactly_one=True.
            raw_candidates = []
            if not locs:
                raw_candidates = []
            else:
                # locs may be a single Location or a list; ensure list
                if isinstance(locs, list):
                    loc_list = locs
                else:
                    loc_list = [locs]
                for loc in loc_list:
                    # loc.raw contains full raw response with 'address'
                    cand = {
                        "lat": float(loc.latitude) if hasattr(loc, "latitude") and loc.latitude is not None else None,
                        "lon": float(loc.longitude) if hasattr(loc, "longitude") and loc.longitude is not None else None,
                        "display_name": loc.address if hasattr(loc, "address") else (loc.raw.get("display_name") if loc.raw else None),
                        "address": loc.raw.get("address") if loc.raw and isinstance(loc.raw, dict) else {},
                        # keep the raw for inspection
                        "raw": loc.raw if hasattr(loc, "raw") else None
                    }
                    raw_candidates.append(cand)

            entry["candidates"] = raw_candidates

            # choose best candidate
            chosen = pick_best_candidate(raw_candidates, prefer_filter=True)
            if chosen:
                entry["lat"] = chosen["lat"]
                entry["lon"] = chosen["lon"]
                entry["display_name"] = chosen["display_name"]
                entry["status"] = "ok"
                entry["chosen"] = chosen
            else:
                entry["lat"] = None
                entry["lon"] = None
                entry["display_name"] = None
                entry["status"] = "not_found"

        except Exception as e:
            entry["candidates"] = []
            entry["lat"] = None
            entry["lon"] = None
            entry["display_name"] = None
            entry["status"] = f"error: {str(e)}"
            print(f"error on {b.get('code','?')}: {e}")

        results.append(entry)
        print(f"[{i}/{len(buildings)}] {b.get('code','?')} -> {entry['status']} (candidates={len(entry.get('candidates',[]))})")
        # small sleep (RateLimiter already enforces min delay, but this is extra safeguard)
        time.sleep(0.1)

    return results

if __name__ == "__main__":
    print("Starting geocoding run (this may take a while).")
    out = geocode_all(buildings)
    outpath = "../purdue_buildings_with_coords.json"
    with open(outpath, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    print(f"Saved {len(out)} records to {outpath}")
